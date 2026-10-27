import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    true
  }

  /// Required alongside Info.plist scene manifest for Xcode 27 / iOS 27 SDK.
  func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let config = UISceneConfiguration(
      name: "Default Configuration",
      sessionRole: connectingSceneSession.role
    )
    config.delegateClass = SceneDelegate.self
    return config
  }

  func application(
    _ application: UIApplication,
    supportedInterfaceOrientationsFor window: UIWindow?
  ) -> UIInterfaceOrientationMask {
    .all
  }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    let window = UIWindow(windowScene: windowScene)
    self.window = window

    factory.startReactNative(
      withModuleName: "TwoEasy",
      in: window,
      launchOptions: launchOptions(from: connectionOptions)
    )

    // Defer Linking until after the bridge is up — calling RCTLinkingManager
    // synchronously in willConnectTo can crash on cold start (iOS 17+/27).
    let pendingURL = connectionOptions.urlContexts.first?.url
    let pendingActivity = connectionOptions.userActivities.first
    if pendingURL != nil || pendingActivity != nil {
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
        if let url = pendingURL {
          RCTLinkingManager.application(
            UIApplication.shared,
            open: url,
            options: [:]
          )
        }
        if let userActivity = pendingActivity {
          RCTLinkingManager.application(
            UIApplication.shared,
            continue: userActivity,
            restorationHandler: { _ in }
          )
        }
      }
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }
    RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    RCTLinkingManager.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }

  private func launchOptions(
    from connectionOptions: UIScene.ConnectionOptions
  ) -> [UIApplication.LaunchOptionsKey: Any]? {
    if let url = connectionOptions.urlContexts.first?.url {
      return [.url: url]
    }
    // Don't stuff NSUserActivity into launchOptions — RN 0.86 bridging can
    // fault on the nested dictionary; Linking is handled after bridge ready.
    if connectionOptions.userActivities.first != nil {
      return nil
    }
    return nil
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
