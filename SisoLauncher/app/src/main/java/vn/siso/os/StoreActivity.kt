package vn.siso.os

import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.JsResult
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView

/**
 * SISO — app cài sẵn trong SISO OS. Mở https://soitrangstore.netlify.app/ trong
 * một cửa sổ riêng (như một PWA): giữ đăng nhập, tải ảnh lên, chơi game web, toàn màn hình.
 * Liên kết ra ngoài (tải APK…) được giao cho trình duyệt.
 */
class StoreActivity : Activity() {

    companion object {
        const val URL = "https://soitrangstore.netlify.app/"
        private const val HOST = "soitrangstore.netlify.app"
        private const val REQ_FILE = 310
    }

    private lateinit var web: WebView
    private lateinit var progress: ProgressBar
    private lateinit var bar: LinearLayout
    private lateinit var root: FrameLayout
    private var chooser: ValueCallback<Array<Uri>>? = null
    private var customView: View? = null
    private var customCb: WebChromeClient.CustomViewCallback? = null

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setBackgroundDrawable(android.graphics.drawable.ColorDrawable(Color.parseColor("#0D0F12")))

        root = FrameLayout(this)
        val col = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(col, FrameLayout.LayoutParams(-1, -1))

        bar = LinearLayout(this).apply {
            gravity = Gravity.CENTER_VERTICAL
            setBackgroundColor(Color.parseColor("#0D0F12"))
        }
        fun btn(t: String, click: () -> Unit) = TextView(this).apply {
            text = t; textSize = if (t.length > 1) 12f else 24f; setTextColor(Color.WHITE); gravity = Gravity.CENTER
            setOnClickListener { click() }
        }
        bar.addView(btn("‹") { onBackPressed() }, LinearLayout.LayoutParams(dp(48), dp(48)))
        bar.addView(android.widget.ImageView(this).apply { setImageResource(R.drawable.siso_logo) },
            LinearLayout.LayoutParams(dp(28), dp(28)).apply { leftMargin = dp(4); rightMargin = dp(10) })
        bar.addView(TextView(this).apply {
            text = "SISO"; textSize = 16f; setTextColor(Color.WHITE)
        }, LinearLayout.LayoutParams(0, -2, 1f))
        bar.addView(btn("Tải lại") { web.reload() }, LinearLayout.LayoutParams(dp(64), dp(48)))
        bar.addView(btn("Đóng") { finish() }, LinearLayout.LayoutParams(dp(56), dp(48)))
        col.addView(bar, LinearLayout.LayoutParams(-1, -2))

        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100; visibility = View.GONE
        }
        col.addView(progress, LinearLayout.LayoutParams(-1, dp(3)))

        web = WebView(this)
        col.addView(web, LinearLayout.LayoutParams(-1, 0, 1f))
        setContentView(root)

        // chừa chỗ cho thanh trạng thái / thanh điều hướng
        root.setOnApplyWindowInsetsListener { v, ins ->
            v.setPadding(0, ins.systemWindowInsetTop, 0, ins.systemWindowInsetBottom)
            ins
        }

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
        }
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true)

        web.setDownloadListener { url, _, _, _, _ -> external(Uri.parse(url)) }
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, r: WebResourceRequest): Boolean {
                val u = r.url
                val h = u.host ?: ""
                if ((u.scheme == "https" || u.scheme == "http") && (h == HOST || h.endsWith(".$HOST"))) return false
                external(u)
                return true
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView, p: Int) {
                progress.progress = p
                progress.visibility = if (p in 1..99) View.VISIBLE else View.GONE
            }

            // WebView mặc định không hiện alert()/confirm() của trang
            override fun onJsAlert(view: WebView, url: String, message: String, result: JsResult): Boolean {
                AlertDialog.Builder(this@StoreActivity).setMessage(message)
                    .setPositiveButton("OK") { _, _ -> result.confirm() }
                    .setOnCancelListener { result.cancel() }.show()
                return true
            }

            override fun onJsConfirm(view: WebView, url: String, message: String, result: JsResult): Boolean {
                AlertDialog.Builder(this@StoreActivity).setMessage(message)
                    .setPositiveButton("OK") { _, _ -> result.confirm() }
                    .setNegativeButton("Hủy") { _, _ -> result.cancel() }
                    .setOnCancelListener { result.cancel() }.show()
                return true
            }

            // chọn ảnh (ảnh đại diện, ảnh nền hồ sơ, ảnh game…)
            override fun onShowFileChooser(
                v: WebView, cb: ValueCallback<Array<Uri>>, p: FileChooserParams
            ): Boolean {
                chooser?.onReceiveValue(null)
                chooser = cb
                return try {
                    startActivityForResult(p.createIntent(), REQ_FILE); true
                } catch (_: Exception) { chooser = null; false }
            }

            // game web chạy toàn màn hình
            override fun onShowCustomView(view: View, cb: CustomViewCallback) {
                if (customView != null) { cb.onCustomViewHidden(); return }
                customView = view; customCb = cb
                root.addView(view, FrameLayout.LayoutParams(-1, -1))
                root.setPadding(0, 0, 0, 0)
                window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_FULLSCREEN or
                    View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY)
            }

            override fun onHideCustomView() {
                customView?.let { (it.parent as? ViewGroup)?.removeView(it) }
                customView = null
                customCb?.onCustomViewHidden(); customCb = null
                window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
                root.requestApplyInsets()
            }
        }

        if (savedInstanceState != null) web.restoreState(savedInstanceState) else web.loadUrl(URL)
    }

    private fun external(u: Uri) {
        try { startActivity(Intent(Intent.ACTION_VIEW, u).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (_: Exception) {}
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQ_FILE) {
            chooser?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data))
            chooser = null
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        when {
            customView != null -> web.webChromeClient?.onHideCustomView()
            web.canGoBack() -> web.goBack()
            else -> finish()
        }
    }

    override fun onSaveInstanceState(out: Bundle) { super.onSaveInstanceState(out); web.saveState(out) }
    override fun onPause() { web.onPause(); CookieManager.getInstance().flush(); super.onPause() }
    override fun onResume() { super.onResume(); web.onResume() }
    override fun onDestroy() { web.destroy(); super.onDestroy() }
}
