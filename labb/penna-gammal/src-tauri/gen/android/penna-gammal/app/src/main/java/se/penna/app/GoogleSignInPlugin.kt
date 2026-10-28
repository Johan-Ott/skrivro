package se.penna.app

import android.app.Activity
import androidx.activity.result.ActivityResult
import androidx.activity.result.IntentSenderRequest
import app.tauri.annotation.ActivityCallback
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.api.Scope

@InvokeArg
class AuthorizeArgs {
  var interactive: Boolean = false
}

// Copied into src-tauri/gen/android by scripts/build-android.mjs.
@TauriPlugin
class GoogleSignInPlugin(private val activity: Activity) : Plugin(activity) {
  private val request = AuthorizationRequest.builder()
    .setRequestedScopes(listOf(Scope("https://www.googleapis.com/auth/drive.file")))
    .build()

  private fun resolve(invoke: Invoke, result: AuthorizationResult) {
    val token = result.accessToken
    if (token == null) return invoke.reject("Google gav ingen nyckel")
    invoke.resolve(JSObject().put("token", token))
  }

  // A background sync is not interactive: it fails instead of showing Google's consent screen.
  @Command
  fun authorize(invoke: Invoke) {
    val isInteractive = invoke.parseArgs(AuthorizeArgs::class.java).interactive
    Identity.getAuthorizationClient(activity).authorize(request)
      .addOnSuccessListener { result ->
        val consent = result.pendingIntent
        if (result.hasResolution() && !isInteractive) {
          invoke.reject("Inte inloggad")
        } else if (result.hasResolution() && consent != null) {
          startIntentSenderForResult(invoke, IntentSenderRequest.Builder(consent).build(), "onConsent")
        } else {
          resolve(invoke, result)
        }
      }
      .addOnFailureListener { error -> invoke.reject(error.message ?: "Inloggningen misslyckades") }
  }

  @ActivityCallback
  private fun onConsent(invoke: Invoke, answer: ActivityResult) {
    if (answer.resultCode != Activity.RESULT_OK) return invoke.reject("Inloggningen avbröts")
    try {
      resolve(invoke, Identity.getAuthorizationClient(activity).getAuthorizationResultFromIntent(answer.data))
    } catch (error: Exception) {
      invoke.reject(error.message ?: "Inloggningen misslyckades")
    }
  }
}
