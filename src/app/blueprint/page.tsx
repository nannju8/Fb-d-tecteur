import Link from "next/link";
import { AppFrame } from "@/components/app-frame";
import { CopyBrief } from "@/components/blueprint/copy-brief";
import { Icon, type IconName } from "@/components/icons";
import { Badge, Card, CodeBlock, KeyValue, SectionHeading } from "@/components/ui";
import { ANDROID_BRIEF } from "@/lib/brief";
import { GUARDRAILS } from "@/lib/guardrails";
import { formatDateTime } from "@/lib/format";
import { getActiveSession, getStats } from "@/lib/vault";

export const dynamic = "force-dynamic";

const GUARDRAILS_SNIPPET = `// guardrails/Guardrails.kt — source de vérité, alignée sur l'API
object Guardrails {
    const val TARGET_MIN = ${GUARDRAILS.targetMin}
    const val TARGET_MAX = ${GUARDRAILS.targetMax}
    const val MIN_DELAY_MS = ${GUARDRAILS.minDelayMs}L
    const val MAX_DELAY_MS = ${GUARDRAILS.maxDelayMs}L
    const val MIN_TICK_SPACING_MS = ${GUARDRAILS.minTickSpacingMs}L
    const val COOLDOWN_MS = ${GUARDRAILS.cooldownMs}L
    const val CHALLENGE_AFTER = ${GUARDRAILS.challengeAfter}
    const val CHALLENGE_PROBABILITY = ${GUARDRAILS.challengeProbability}
    const val MAX_LIBRARY_CLIPS = ${GUARDRAILS.maxLibraryClips}
    const val MAX_FILE_BYTES = ${GUARDRAILS.maxFileBytes}L
    val ALLOWED_HOSTS = listOf("facebook.com", "fbcdn.net")

    fun clampTarget(requested: Int): Int = requested.coerceIn(TARGET_MIN, TARGET_MAX)
    fun nextDelayMs(): Long = Random.nextLong(MIN_DELAY_MS, MAX_DELAY_MS)
    fun hostAllowed(host: String): Boolean =
        ALLOWED_HOSTS.any { host == it || host.endsWith(".\$it") }
}`;

const WEBVIEW_SNIPPET = `// access/LockedFacebookWebView.kt
@Composable
fun LockedFacebookWebView(onSession: (String) -> Unit) {
    var lastReported by remember { mutableStateOf<String?>(null) }
    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { context ->
            WebView(context).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.mediaPlaybackRequiresUserGesture = true
                webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(
                        view: WebView,
                        request: WebResourceRequest,
                    ): Boolean {
                        val host = request.url.host.orEmpty()
                        // Tout ce qui sort de l'allow-list est bloqué, pas redirigé.
                        if (!Guardrails.hostAllowed(host)) {
                            events.record(EventType.BLOCKED_NAVIGATION, host)
                            return true
                        }
                        return false
                    }

                    override fun onPageFinished(view: WebView, url: String) {
                        val cookies = CookieManager.getInstance().getCookie(url).orEmpty()
                        Regex("(?:^|;\\\\s*)c_user=(\\\\d+)")
                            .find(cookies)?.groupValues?.get(1)
                            ?.takeIf { it != lastReported }
                            ?.let {
                                lastReported = it
                                onSession(it) // ouvre le sélecteur de quantité
                            }
                    }
                }
                loadUrl("https://m.facebook.com/")
            }
        },
    )
}
// Verrouillage : CookieManager.getInstance().removeAllCookies(null)
// puis WebView.clearCache(true) et révocation de la session Room.`;

const ROOM_SNIPPET = `// vault/ClipEntity.kt
@Entity(tableName = "clips")
data class ClipEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val runId: Long?,
    val title: String,
    val author: String,
    val caption: String = "",
    val origin: Origin,                  // PROGRESSIVE | MANUAL
    val sourceUrl: String? = null,
    val localPath: String? = null,       // filesDir/clips/<id>.mp4
    val durationMs: Long = 0,
    val sizeBytes: Long = 0,
    val status: ClipStatus,              // QUEUED | READY | FAILED | ABORTED
    val favorite: Boolean = false,
    val watched: Boolean = false,
    val watchPositionMs: Long = 0,
    @ColumnInfo(name = "created_at") val createdAt: Long = System.currentTimeMillis(),
)

@Dao
interface ClipDao {
    @Query("SELECT * FROM clips WHERE status = 'READY' ORDER BY created_at DESC")
    fun observeLibrary(): Flow<List<ClipEntity>>

    @Query("SELECT * FROM clips WHERE run_id = :runId AND status = 'QUEUED' ORDER BY id LIMIT 1")
    suspend fun nextQueued(runId: Long): ClipEntity?

    @Query("UPDATE clips SET status = 'ABORTED' WHERE run_id = :runId AND status = 'QUEUED'")
    suspend fun abortQueued(runId: Long)
}`;

const WORKER_SNIPPET = `// collect/CollectWorker.kt — un item par exécution
class CollectWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val run = repo.activeRun() ?: return Result.success()
        if (run.status != RunStatus.RUNNING) return Result.success()

        // Garde-fou temporel : jamais deux items sans pause réelle.
        val sinceLast = SystemClock.elapsedRealtime() - run.lastTickAt
        if (sinceLast < Guardrails.MIN_TICK_SPACING_MS) {
            return Result.retry()
        }

        if (run.succeeded >= Guardrails.CHALLENGE_AFTER &&
            Random.nextDouble() < Guardrails.CHALLENGE_PROBABILITY
        ) {
            repo.abort(run.id, Reason.SECURITY_CHALLENGE)
            repo.abortQueued(run.id)
            return Result.success() // pas de relance, pas de contournement
        }

        val clip = repo.nextQueued(run.id) ?: return repo.complete(run)
        val delayMs = Guardrails.nextDelayMs()
        delay(delayMs)

        return try {
            val file = mediaCache.download(clip, Guardrails.MAX_FILE_BYTES) // .part puis rename
            repo.markReady(clip.id, file)
            repo.bump(run.id, success = true)
            Result.success()
        } catch (error: MediaException) {
            repo.markFailed(clip.id, error.reason)
            repo.bump(run.id, success = false)
            if (repo.consecutiveFailures(run.id) >= 3) repo.abort(run.id, error.reason)
            Result.success()
        }
    }
}

// Planification séquentielle, réseau requis, backoff exponentiel :
val request = OneTimeWorkRequestBuilder<CollectWorker>()
    .setConstraints(Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .setRequiresBatteryNotLow(true)
        .build())
    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
    .addTag("vault-collect")
    .build()`;

const PLAYER_SNIPPET = `// player/OfflineReelsScreen.kt
@Composable
fun OfflineReelsScreen(clips: List<ClipEntity>, startId: Long?) {
    if (clips.isEmpty()) return EmptyVault()
    val pager = rememberPagerState(
        initialPage = clips.indexOfFirst { it.id == startId }.coerceAtLeast(0),
        pageCount = { clips.size },
    )

    VerticalPager(
        state = pager,
        pageSpacing = 8.dp,
        beyondViewportPageCount = 1,
        modifier = Modifier.fillMaxSize(),
    ) { page ->
        val clip = clips[page]
        val isActive = pager.currentPage == page
        val player = rememberOfflinePlayer(clip.localPath, isActive) // ExoPlayer unique
        val scope = rememberCoroutineScope()

        Box(Modifier.fillMaxSize().background(Color.Black)) {
            PlayerSurface(player, Modifier.fillMaxSize()) // AndroidView(PlayerView)
            ReelsActionRail(
                favorite = clip.favorite,
                onFavorite = { repo.toggleFavorite(clip.id) },
                onSaveOffline = { scope.launch { repo.cache(clip.id) } },
            )
            ReelsCaption(clip)
            SeekBar(
                positionMs = player.currentPosition,
                durationMs = player.duration,
                onSeek = { player.seekTo(it) },
            )
        }
    }

    // Reprise : sauvegarde toutes les 5 s + onDispose
    LaunchedEffect(pager.currentPage) {
        snapshotFlow { pager.currentPage }.collect { paused ->
            repo.savePosition(clips[paused].id, lastPositionMs)
        }
    }
}`;

const MAPPING: { web: string; android: string; icon: IconName }[] = [
  { web: "Session locale en base", android: "DataStore + Room, session révocable", icon: "lock" },
  { web: "WebView / poste de connexion", android: "WebView borné + CookieManager c_user", icon: "shield" },
  { web: "Ticks HTTP + pauses serveur", android: "WorkManager + CoroutineWorker séquentiel", icon: "download" },
  { web: "PostgreSQL / Drizzle", android: "Room, flows observables, migrations", icon: "database" },
  { web: ".data/vault + route média", android: "filesDir/clips + EncryptedFile (Keystore)", icon: "database" },
  { web: "Flux vertical du lecteur", android: "VerticalPager + Media3 ExoPlayer", icon: "play" },
];

export default async function BlueprintPage() {
  const session = await getActiveSession();
  const stats = await getStats();

  return (
    <AppFrame session={session} stats={stats}>
      <div className="space-y-6">
        <SectionHeading
          eyebrow="Plan technique"
          title="Du prototype web à l'application Android"
          description="Le parcours complet est exécutable ici : session verrouillée, collecte bornée, cache privé, lecture verticale. Cette page donne la correspondance module par module, les garde-fous à porter dans Guardrails.kt et le brief prêt à transmettre."
          icon="blueprint"
          action={<CopyBrief text={ANDROID_BRIEF} />}
        />

        <Card className="overflow-hidden">
          <div className="grid gap-4 border-b border-line/60 bg-gradient-to-br from-brand/12 via-transparent to-mint/5 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand" icon="sparkles">
                  Kotlin · Compose · Media3
                </Badge>
                <Badge tone="mint" icon="database">
                  Room · WorkManager
                </Badge>
                <Badge tone="amber" icon="info">
                  prototype web, pas l&apos;APK
                </Badge>
              </div>
              <h2 className="mt-3 text-lg font-semibold text-cream">
                Une architecture en quatre modules, sans dépendance à un « second robot »
              </h2>
              <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-muted">
                Toute la logique de décision (taille du lot, pauses, arrêt sur défi,
                plafond de stockage) vit côté worker. L&apos;UI ne fait que proposer une
                valeur, systématiquement re-bornée.
              </p>
            </div>
            <div className="rounded-2xl border border-line/70 bg-panel/70 px-4 py-3 text-[11px]">
              <div className="flex items-center justify-between gap-6">
                <span className="text-muted">Export du brief</span>
                <span className="font-mono text-cream">{formatDateTime(new Date().toISOString())}</span>
              </div>
              <KeyValue label="Modules" value="4" />
              <KeyValue label="Plafond / session" value={`${GUARDRAILS.targetMax} vidéos`} />
              <KeyValue label="Pause inter-sessions" value={`${GUARDRAILS.cooldownMs / 1000} s`} />
            </div>
          </div>

          <div className="grid gap-px bg-line/50 sm:grid-cols-2 lg:grid-cols-3">
            {MAPPING.map((row) => (
              <div key={row.web} className="bg-panel/60 px-5 py-4">
                <div className="flex items-center gap-2 text-[11px] text-muted">
                  <Icon name={row.icon} size={13} className="text-brand-soft" />
                  {row.web}
                </div>
                <div className="mt-1.5 flex items-start gap-1.5 text-[11px] font-medium text-cream">
                  <Icon name="arrowRight" size={12} className="mt-0.5 shrink-0 text-mint" />
                  {row.android}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-5">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
                  <Icon name="sliders" size={13} />
                  01 · Garde-fous partagés
                </div>
                <h3 className="mt-1 text-sm font-semibold text-cream">
                  Les mêmes constantes que l&apos;API, jamais dupliquées à la main
                </h3>
              </div>
              <Badge tone="neutral">Guardrails.kt</Badge>
            </div>
            <div className="mt-3">
              <CodeBlock code={GUARDRAILS_SNIPPET} filename="guardrails/Guardrails.kt" />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
                  <Icon name="shield" size={13} />
                  02 · Accès borné et détection de session
                </div>
                <h3 className="mt-1 text-sm font-semibold text-cream">
                  Allow-list, c_user, puis révocation explicite
                </h3>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
                  Le WebView ne charge que facebook.com et fbcdn.net. Toute autre
                  destination est bloquée et journalisée. La valeur{" "}
                  <span className="font-mono text-[11px]">c_user</span> déclenche le
                  sélecteur de quantité, elle n&apos;est jamais écrite en clair.
                </p>
              </div>
              <Badge tone="mint" icon="lock">local only</Badge>
            </div>
            <div className="mt-3">
              <CodeBlock code={WEBVIEW_SNIPPET} filename="access/LockedFacebookWebView.kt" />
            </div>
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="p-5">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
                <Icon name="database" size={13} />
                03 · Room
              </div>
              <h3 className="mt-1 text-sm font-semibold text-cream">
                Métadonnées du coffre et positions de lecture
              </h3>
              <div className="mt-3">
                <CodeBlock code={ROOM_SNIPPET} filename="vault/ClipEntity.kt" />
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
                <Icon name="download" size={13} />
                04 · WorkManager
              </div>
              <h3 className="mt-1 text-sm font-semibold text-cream">
                Une entrée par exécution, arrêt sans relance
              </h3>
              <div className="mt-3">
                <CodeBlock code={WORKER_SNIPPET} filename="collect/CollectWorker.kt" />
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
                  <Icon name="play" size={13} />
                  05 · Lecteur hors connexion
                </div>
                <h3 className="mt-1 text-sm font-semibold text-cream">
                  VerticalPager, un seul ExoPlayer, reprise persistée
                </h3>
              </div>
              <Link
                href="/reels"
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-[11px] font-medium text-cream transition hover:border-brand/40"
              >
                <Icon name="film" size={13} />
                Voir le flux web
              </Link>
            </div>
            <div className="mt-3">
              <CodeBlock code={PLAYER_SNIPPET} filename="player/OfflineReelsScreen.kt" />
            </div>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-mint">
              <Icon name="shield" size={13} />
              Checklist sécurité & vie privée
            </div>
            <ul className="mt-3 space-y-2.5 text-xs text-muted">
              {[
                "Fichiers dans filesDir/clips, jamais dans MediaStore : invisibles pour la galerie.",
                "Chiffrement au repos via EncryptedFile + clés Android Keystore (option recommandée).",
                "Aucun cookie ni URL signée dans les logs, aucune analytique tierce.",
                "Révocation : suppression des cookies du WebView, cache vidé, session Room fermée.",
                "Suppression d'une vidéo = fichier local supprimé puis entrée Room retirée.",
                "Un défi de sécurité laisse une entrée d'audit et bloque la reprise automatique.",
                "Import via SAF : l'app ne demande jamais l'accès global au stockage.",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Icon name="check" size={13} className="mt-0.5 shrink-0 text-mint" />
                  {line}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber">
              <Icon name="alert" size={13} />
              Limites assumées
            </div>
            <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-muted">
              {[
                "Les Reels ne sont pas des URL publiques statiques : session, en-têtes, segments DASH/HLS éphémères, audio et vidéo parfois séparés.",
                "Un rythme « humain » ne rend pas une collecte invisible : c'est pourquoi les lots restent petits et s'arrêtent sur alerte.",
                "Un second robot distant ne fait que déplacer le problème : plus de latence, de points de panne et de signaux automatisés.",
                "L'extraction automatique n'est pas fournie ici. L'import manuel de vos propres fichiers reste la voie fiable et conforme.",
                "Vérifiez les conditions d'utilisation du réseau concerné avant toute automatisation.",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Icon name="info" size={13} className="mt-0.5 shrink-0 text-amber" />
                  {line}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 px-5 py-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
                <Icon name="blueprint" size={13} />
                Brief prêt à transmettre
              </div>
              <h3 className="mt-1 text-sm font-semibold text-cream">
                Le contrat complet, à coller dans votre outil de suivi
              </h3>
            </div>
            <CopyBrief text={ANDROID_BRIEF} />
          </div>
          <div className="hide-scrollbar max-h-[420px] overflow-auto bg-[#070a12] p-5">
            <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[#c9d4ea]">
              {ANDROID_BRIEF}
            </pre>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-cream">Critères d&apos;acceptation testables ici</h3>
              <p className="mt-1 text-xs text-muted">
                Ce prototype web vérifie déjà chaque point côté serveur.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/collecte"
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-[11px] font-medium text-cream"
              >
                <Icon name="download" size={13} />
                Tester un lot
              </Link>
              <Link
                href="/reels"
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-[11px] font-medium text-cream"
              >
                <Icon name="play" size={13} />
                Tester la lecture
              </Link>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              "Lot impossible au-delà de 15, même en modifiant la requête.",
              "Deux sessions ne peuvent pas se chevaucher.",
              "Cooldown serveur après une session terminée ou interrompue.",
              "Arrêt immédiat sur défi de sécurité simulé.",
              "Fichier copié dans le stockage privé, puis lecture locale.",
              "Suppression qui retire aussi le fichier du coffre.",
            ].map((line) => (
              <div
                key={line}
                className="flex items-start gap-2 rounded-xl border border-line/60 bg-void/40 px-3 py-2.5 text-[11px] text-muted"
              >
                <Icon name="check" size={13} className="mt-0.5 shrink-0 text-mint" />
                {line}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppFrame>
  );
}
