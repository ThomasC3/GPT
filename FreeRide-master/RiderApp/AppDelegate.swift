//
//  AppDelegate.swift
//  Circuit
//
//  Created by Andrew Boryk on 11/28/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit
import GoogleMaps
import GooglePlaces
import Bugsnag
import AppTrackingTransparency
import GoogleSignIn

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
        // Speed up animations if `disableAnimations` arg is present.
        if CommandLine.arguments.contains("-disableAnimations") {
            self.window?.layer.speed = 2.0
        }
        // Network Monitoring
        debug_RocketSimNetworkObserver()
        #endif
        
        Defaults.forgotPasswordAccessToken = nil

        BugsnagManager.initialize()
        MixpanelManager.initialize()
        StripeManager.initialize()
        
        #if PRODUCTION || STAGING
        GAManager.initialize()
        #endif
        
        if let mapsAPIKey = Bundle.main.object(forInfoDictionaryKey: "Maps API Key") as? String {
            GMSServices.provideAPIKey(mapsAPIKey)
            GMSPlacesClient.provideAPIKey(mapsAPIKey)
        }
        
        if let userActivity = launchOptions?[.userActivityDictionary] as? NSUserActivity,
            userActivity.activityType == NSUserActivityTypeBrowsingWeb,
            let url = userActivity.webpageURL {
            handleDeepLinkCoordinates(url: url)
        }
       
        if RiderAppContext.shared.isLoggedIn {
            let user = RiderAppContext.shared.currentUser
            if !user.hasDateOfBirth() {
                // User needs to complete their profile
                let vc = RegisterIncompleteViewController()
                vc.shouldResetRegistrationOnBack = true
                window?.rootViewController = NavigationController(rootViewController: vc)
            } else if user.isPhoneVerified || Defaults.skipPhoneVerification {
                // User is ok
                let vc = RiderTabBarController()
                window?.rootViewController = vc
                MixpanelManager.checkPermissionAndIdentifyUser(user)
                BugsnagManager.checkPermissionAndIdentifyUser(user)
                GAManager.checkPermissionAndIdentifyUser(user)
                IntercomManager.checkPermissionAndIdentifyUser(RiderAppContext.shared.currentUser)
            } else {
                // User needs to verify their phone number
                let vc = PhoneVerifyViewController()
                vc.completingPhoneVerification = true
                window?.rootViewController = NavigationController(rootViewController: vc)
            }
        } else {
            let vc: WalkthroughViewController = .instantiateFromStoryboard()
            window?.rootViewController = NavigationController(rootViewController: vc)
        }

        NotificationCoordinator.checkNotificationPermissions()

        return true
    }
    
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        var handled: Bool

        handled = GIDSignIn.sharedInstance.handle(url)
        if handled {
            return true
        }

        // Handle other custom URL types.
        // If not handled by this app, return false.
        return false
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
    }

    func applicationWillTerminate(_ application: UIApplication) {
        #if RIDER
        RiderAppContext.shared.socket.disconnect()
        #elseif DRIVER
        DriverAppContext.shared.socket.disconnect()
        #endif
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Defaults.deviceToken = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        NotificationCoordinator.updateDeviceToken()
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity,
                    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
                  let url = userActivity.webpageURL else {
            return false
        }
        
        handleDeepLinkCoordinates(url: url)
        return true
    }

    private func handleDeepLinkCoordinates(url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true) else {
            return
        }
        
        let queryItems = components.queryItems ?? []
        let originLat = queryItems.first { $0.name == "origin_lat" }?.value.flatMap(Float.init)
        let originLon = queryItems.first { $0.name == "origin_lon" }?.value.flatMap(Float.init)
        let destLat = queryItems.first { $0.name == "destination_lat" }?.value.flatMap(Float.init)
        let destLon = queryItems.first { $0.name == "destination_lon" }?.value.flatMap(Float.init)
        
        if let originLat = originLat, let originLon = originLon,
           let destLat = destLat, let destLon = destLon {
            GAManager.trackEvent("route_link_click", properties: [
                "origin_lat": originLat,
                "origin_lon": originLon,
                "destination_lat": destLat,
                "destination_lon": destLon,
            ])
            RouteStorage.shared.setRoute(originLat: originLat, originLon: originLon,
                                         destinationLat: destLat, destinationLon: destLon)
            
        }
    }
}
