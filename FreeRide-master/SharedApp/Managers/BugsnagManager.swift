//
//  BugsnagManager.swift
//  FreeRide
//

import Foundation
import Bugsnag
import BugsnagNetworkRequestPlugin
import AppTrackingTransparency

class BugsnagManager {

    static func initialize() {
        let config = BugsnagConfiguration.loadConfig()
        config.add(BugsnagNetworkRequestPlugin())
        Bugsnag.start(with: config)
    }
    
    static func checkPermissionAndIdentifyUser(_ user: User) {
        #if RIDER
        if #available(iOS 14, *) {
            ATTrackingManager.requestTrackingAuthorization { status in
                if status == .authorized {
                    print("ATT_DEBUG: authorized. identifying user on bugsnag")
                    identifyUser(user)
                }
            }
        } else {
            identifyUser(user)
        }
        #elseif DRIVER
        identifyUser(user)
        #endif
    }
    
    static func identifyUser(_ user: User) {
        Bugsnag.setUser(user.id, withEmail: user.email, andName: user.firstName)
    }

    static func notifyError(_ name: String, reason: String) {
        let exception = NSException(
            name: NSExceptionName(rawValue: name),
            reason: reason,
            userInfo: nil
        )
        Bugsnag.notify(exception)
    }

}
