package se.penna.app

import android.content.Context
import android.graphics.Rect
import android.os.Bundle
import android.view.ActionMode
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.widget.FrameLayout
import android.webkit.WebView
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.ScriptHandler
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature

// Copied into src-tauri/gen/android by scripts/build-android.mjs, which Tauri generates and git ignores.
class MainActivity : TauriActivity() {
  private var webView: WebView? = null
  private var safeAreaScript: ScriptHandler? = null

  // Tauri's own back only steps the WebView's history, past Studio and open panels; Penna's
  // page decides instead.
  override val handleBackNavigation = false

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    followInsets()
    followBack()
  }

  override fun onWebViewCreate(webView: WebView) {
    this.webView = webView
    followBack()
    ViewCompat.requestApplyInsets(findViewById(android.R.id.content))
  }

  // Edge to edge, Android no longer shrinks the page for the keyboard, so the text and the tools
  // over it would lie behind it. The page ends where the keyboard begins.
  private fun followInsets() {
    ViewCompat.setOnApplyWindowInsetsListener(findViewById<View>(android.R.id.content)) { view, insets ->
      view.setPadding(0, 0, 0, insets.getInsets(WindowInsetsCompat.Type.ime()).bottom)
      val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
      shareSafeArea(bars.top / resources.displayMetrics.density, bars.bottom / resources.displayMetrics.density)
      insets
    }
  }

  // The WebView reports env(safe-area-inset-*) as 0, so the page gets the status and navigation
  // bars' heights as --safe-top and --safe-bottom instead, now and on every load.
  private fun shareSafeArea(top: Float, bottom: Float) {
    val view = webView ?: return
    val script = "document.documentElement.style.setProperty('--safe-top','${top}px');" +
      "document.documentElement.style.setProperty('--safe-bottom','${bottom}px');"
    view.evaluateJavascript(script, null)
    if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) return
    safeAreaScript?.remove()
    safeAreaScript = WebViewCompat.addDocumentStartJavaScript(view, script, setOf("*"))
  }

  // Wry hands the WebView over here; the frame around it sees every menu the WebView starts.
  override fun setContentView(view: View?) {
    super.setContentView(SelectionMenuFrame(this).apply { addView(view) })
  }

  // Back asks the page first: it closes a menu or dialog, or goes to the screen before. With
  // nothing left, the app goes to the background; Tauri cannot recreate a destroyed activity in
  // the same process (it hangs on the splash), so it is never finished.
  private val back = object : OnBackPressedCallback(true) {
    override fun handleOnBackPressed() {
      val view = webView ?: return run { moveTaskToBack(true) }
      view.evaluateJavascript("window.pennaBack ? window.pennaBack() : false") { handled ->
        if (handled != "true") moveTaskToBack(true)
      }
    }
  }

  // The newest callback answers first, and Tauri's app plugin adds one that only steps the
  // history once the page has loaded; Penna's is put back on top after it.
  private fun followBack() {
    back.remove()
    onBackPressedDispatcher.addCallback(this, back)
  }

  override fun onResume() {
    super.onResume()
    followBack()
  }
}

private class SelectionMenuFrame(context: Context) : FrameLayout(context) {
  override fun startActionModeForChild(originalView: View, callback: ActionMode.Callback, type: Int): ActionMode? =
    super.startActionModeForChild(originalView, WithoutSelectionMenu(callback, context.getString(android.R.string.copy)), type)
}

// Penna's own bar holds what a selection needs, so the system's menu over it is emptied. The
// caret's menu, with paste, has no Copy and stays.
private class WithoutSelectionMenu(
  private val inner: ActionMode.Callback,
  private val copy: String,
) : ActionMode.Callback2() {
  override fun onCreateActionMode(mode: ActionMode, menu: Menu) =
    inner.onCreateActionMode(mode, menu).also { emptyIfSelection(menu) }

  override fun onPrepareActionMode(mode: ActionMode, menu: Menu) =
    inner.onPrepareActionMode(mode, menu).also { emptyIfSelection(menu) }

  override fun onActionItemClicked(mode: ActionMode, item: MenuItem) = inner.onActionItemClicked(mode, item)

  override fun onDestroyActionMode(mode: ActionMode) = inner.onDestroyActionMode(mode)

  override fun onGetContentRect(mode: ActionMode, view: View, outRect: Rect) {
    if (inner is ActionMode.Callback2) inner.onGetContentRect(mode, view, outRect)
    else super.onGetContentRect(mode, view, outRect)
  }

  private fun emptyIfSelection(menu: Menu) {
    val hasCopy = (0 until menu.size()).any { menu.getItem(it).title?.toString() == copy }
    if (hasCopy || menu.findItem(android.R.id.copy) != null) menu.clear()
  }
}
