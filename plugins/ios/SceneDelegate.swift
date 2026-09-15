import React
import UIKit

/// Minimal `UIWindowSceneDelegate` that adopts the UIKit scene lifecycle
/// required by the iOS 27 SDK (Xcode 27) — without it, UIKit hard-crashes at
/// launch with `UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`
/// before any app code runs. Expo's prebuild template doesn't generate this
/// yet, so it's injected by `withUiSceneLifecycle.js`.
///
/// This takes over the window + React Native startup that `AppDelegate` used
/// to do directly, and re-forwards deep links / universal links the same way
/// `AppDelegate`'s `open url` / `continue userActivity` overrides used to —
/// those AppDelegate methods stop being called once the app is scene-based.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let factory = appDelegate.reactNativeFactory
    else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    factory.startReactNative(withModuleName: "main", in: window, launchOptions: nil)

    if let urlContext = connectionOptions.urlContexts.first {
      RCTLinkingManager.application(UIApplication.shared, open: urlContext.url, options: [:])
    } else if let userActivity = connectionOptions.userActivities.first {
      RCTLinkingManager.application(
        UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let urlContext = URLContexts.first else { return }
    RCTLinkingManager.application(UIApplication.shared, open: urlContext.url, options: [:])
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    RCTLinkingManager.application(
      UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
