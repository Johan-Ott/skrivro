package se.penna.app

import android.app.Activity
import android.content.Intent
import androidx.core.content.FileProvider
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin
import java.io.File

@InvokeArg
class ShareArgs {
  var path: String = ""
  var mime: String = "*/*"
}

// Copied into src-tauri/gen/android by scripts/build-android.mjs. A phone has no "save as":
// a picture or an export goes to Android's share sheet, which can also save it to Files or Drive.
@TauriPlugin
class SharePlugin(private val activity: Activity) : Plugin(activity) {
  @Command
  fun share(invoke: Invoke) {
    val args = invoke.parseArgs(ShareArgs::class.java)
    try {
      val uri = FileProvider.getUriForFile(activity, "${activity.packageName}.fileprovider", File(args.path))
      val send = Intent(Intent.ACTION_SEND).apply {
        type = args.mime
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      activity.startActivity(Intent.createChooser(send, null))
      invoke.resolve()
    } catch (error: Exception) {
      invoke.reject(error.message ?: "Delningen misslyckades")
    }
  }
}
