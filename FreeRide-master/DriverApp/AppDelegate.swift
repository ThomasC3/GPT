//
//  AppDelegate.swift
//  DriverApp
//
//  Created by Andrew Boryk on 12/14/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit
import GoogleMaps
import Bugsnag

extension Notification.Name {
    static let applicationWillEnterForeground = Notification.Name(rawValue: "applicationWillEnterForeground")
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        #if DEBUG
        // Disable AutoLayout constraint warnings in debug console output.
        UserDefaults.standard.set(false, forKey: "_UIConstraintBasedLayoutLogUnsatisfiable")
        // Network Monitoring
        debug_RocketSimNetworkObserver()
        #endif

        Defaults.forgotPasswordAccessToken = nil
        
        BugsnagManager.initialize()

        MixpanelManager.initialize()

        if let mapsAPIKey = Bundle.main.object(forInfoDictionaryKey: "Maps API Key") as? String {
            GMSServices.provideAPIKey(mapsAPIKey)
        }

        if DriverAppContext.shared.isLoggedIn {
            let vc = DriverTabBarController()
            window?.rootViewController = vc
            MixpanelManager.checkPermissionAndIdentifyUser(DriverAppContext.shared.currentUser)
            BugsnagManager.checkPermissionAndIdentifyUser(DriverAppContext.shared.currentUser)
        } else {
            let vc = LoginViewController()
            let navVC = NavigationController(rootViewController: vc)
            window?.rootViewController = navVC
        }
        
        NotificationCoordinator.checkNotificationPermissions()

        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
        Notification.post(.applicationWillEnterForeground)
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.

        UIApplication.shared.applicationIconBadgeNumber = 0
        
        let context = DriverAppContext.shared

        guard context.isLoggedIn else {
            return
        }
        
        context.api.getDriverStatus { result in
            switch result {
            case .success(let response):
                //change availability setting
                let currentUser = context.currentUser
                currentUser.update(with: response)
                //update vehicle
                let ds = context.dataStore
                ds.wipeVehicles()
                if let v = response.vehicle {
                    let vehicle = Vehicle(context: context.dataStore.mainContext)
                    vehicle.update(with: v)
                }
                                
                Notification.post(.didUpdateDriverStatus)
            default:
               break
            }
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Defaults.deviceToken = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        NotificationCoordinator.updateDeviceToken()
    }
}

