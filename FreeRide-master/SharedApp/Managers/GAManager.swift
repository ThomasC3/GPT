//
//  GAManager.swift
//  FreeRide
//

import Foundation
import FirebaseCore
import FirebaseAnalytics
import OSLog
import AppTrackingTransparency

enum GAEvents {
    static let RIDER_SERVICE_INDICATOR_RECEIVED = "service_indicator"
    static let RIDER_SOCKET_DISCONNECTED = "socket_disconnected"
}


class GAManager {
    
    static func initialize() {
        FirebaseApp.configure()
        print("GA_DEBUG", "initializing analytics")
    }
    
    static func checkPermissionAndIdentifyUser(_ user: User) {
        #if RIDER
        ATTrackingManager.requestTrackingAuthorization { status in
            if status == .authorized {
                print("ATT_DEBUG: authorized. identifying user on GA")
                identifyUser(user)
            }
        }
        #elseif DRIVER
        identifyUser(user)
        #endif
    }
    
    static func identifyUser(_ user: User) {
        
        Analytics.setUserID(user.id)
        Analytics.setUserProperty(user.firstName, forName: "first-name")
        Analytics.setUserProperty(user.lastName, forName: "last_name")
        Analytics.setUserProperty(user.email, forName: "email")
        Analytics.setUserProperty(user.zip, forName: "zip")
        Analytics.setUserProperty(TranslationsManager.getCurrentLanguage(), forName: "locale")
        
        if let dob = user.dob {
            Analytics.setUserProperty(dob, forName: "dob")
        }

        #if RIDER
        if let verificationDeadline = user.emailVerificationDeadline {
            let dateFormatter = DateFormatter(dateFormat:"yyyy-MM-dd")
            Analytics.setUserProperty(dateFormatter.string(from: verificationDeadline), forName: "verification_deadline")
        }
        #endif
        
        if let phone = user.phone {
            Analytics.setUserProperty(phone, forName: "phone")
        }
        
        if let gender = user.gender {
            Analytics.setUserProperty(gender, forName: "gender")
        }
    }
    
    static func trackEvent(_ event: String, properties: [String: Any]? = nil) {
        #if RIDER
        let context = RiderAppContext.shared
        #elseif DRIVER
        let context = DriverAppContext.shared
        #endif
        
        var propsToSend: [String: Any] = properties ?? [:]

        if context.currentLocation != nil {
            propsToSend["location"] = context.currentLocation?.name
        }

        // Convert all Date properties to ISO 8601 strings
        for (key, value) in propsToSend {
            if let dateValue = value as? Date {
                let formatter = ISO8601DateFormatter()
                formatter.timeZone = TimeZone(secondsFromGMT: 0)
                formatter.formatOptions = [.withInternetDateTime]
                propsToSend[key] = formatter.string(from: dateValue)
            }
        }

        Analytics.logEvent(event, parameters: propsToSend)

        Logger.analytics.info("\(event) (\(propsToSend)")
    }
}
