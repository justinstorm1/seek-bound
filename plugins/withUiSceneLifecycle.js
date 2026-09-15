const {
  withInfoPlist,
  withAppDelegate,
  withXcodeProject,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PROJECT_NAME = 'SeekBound';

// The exact block Expo's SDK 57 prebuild template puts in AppDelegate.swift.
// Stripped out because SceneDelegate.swift now owns the window instead.
const APP_DELEGATE_WINDOW_BLOCK = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`;
const APP_DELEGATE_WINDOW_BLOCK_REPLACEMENT =
  '    // Window + React Native startup happen in SceneDelegate.swift — required by the\n' +
  "    // iOS 27 SDK's UIScene lifecycle (see plugins/withUiSceneLifecycle.js).\n";

/**
 * Adopts the UIKit scene lifecycle, required by the iOS 27 SDK (Xcode 27) —
 * without it, UIApplicationMain hard-crashes at launch with
 * `UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption` before any
 * app code runs. Expo's SDK 57 prebuild template doesn't generate this yet
 * (the fix landed upstream only in the unreleased SDK 58), so this patches it
 * in at prebuild time:
 *  - adds `UIApplicationSceneManifest` to Info.plist
 *  - copies in `plugins/ios/SceneDelegate.swift`, which now owns the window
 *  - registers that file with the Xcode project
 *  - strips the window/startReactNative call out of the generated AppDelegate
 *
 * Drop this once Expo SDK 58 (or a 57.x backport) ships the real fix.
 */
function withUiSceneLifecycle(config) {
  config = withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return config;
  });

  config = withDangerousMod(config, [
    'ios',
    (config) => {
      const src = path.join(config.modRequest.projectRoot, 'plugins', 'ios', 'SceneDelegate.swift');
      const destDir = path.join(config.modRequest.platformProjectRoot, PROJECT_NAME);
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, path.join(destDir, 'SceneDelegate.swift'));
      return config;
    },
  ]);

  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    const group = project.pbxGroupByName(PROJECT_NAME);
    const groupKey = project.findPBXGroupKey({ name: PROJECT_NAME });
    const alreadyAdded = group?.children?.some((c) => c.comment === 'SceneDelegate.swift');
    if (groupKey && !alreadyAdded) {
      project.addSourceFile(`${PROJECT_NAME}/SceneDelegate.swift`, {}, groupKey);
    }
    return config;
  });

  config = withAppDelegate(config, (config) => {
    if (config.modResults.contents.includes(APP_DELEGATE_WINDOW_BLOCK)) {
      config.modResults.contents = config.modResults.contents.replace(
        APP_DELEGATE_WINDOW_BLOCK,
        APP_DELEGATE_WINDOW_BLOCK_REPLACEMENT,
      );
    }
    return config;
  });

  return config;
}

module.exports = withUiSceneLifecycle;
