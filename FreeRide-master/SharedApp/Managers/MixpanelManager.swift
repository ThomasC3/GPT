//
//  MixpanelManager.swift
//  FreeRide
//
//  Created by Rui Magalhães on 17/06/2019.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation
import Mixpanel
import AppTrackingTransparency
import Bugsnag
import OSLog

enum MixpanelEvents {
    static let DRIVER_HAILED_RIDE_ADDED = "Hailed ride added"
    static let DRIVER_RIDE_COMPLETED = "Ride completed"
    static let DRIVER_RIDE_CANCELED = "Ride canceled"
    static let DRIVER_RIDE_CANCELED_BEFORE_ARRIVAL = "Ride canceled before arrival"
    static let DRIVER_RIDE_PICK_UP = "Ride pick up"
    static let DRIVER_RIDE_DRIVER_ARRIVED = "Ride driver arrived"
    static let DRIVER_RIDE_RATED = "Ride rated"
    static let DRIVER_RIDER_NO_SHOW = "Rider no show"
    static let DRIVER_VEHICLE_CHECK_OUT = "Vehicle check out"
    static let DRIVER_VEHICLE_CHECK_IN = "Vehicle check in"
    static let DRIVER_AVAILABLE = "Driver available"
    static let DRIVER_UNAVAILABLE = "Driver unavailable"

    static let RIDER_RIDE_REQUESTED = "Ride requested"
    static let RIDER_RIDE_CANCELED_BEFORE_ACCEPTANCE = "Ride canceled before acceptance"
    static let RIDER_RIDE_CANCELED_AFTER_ACCEPTANCE = "Ride canceled after acceptance"
    static let RIDER_RIDE_STARTED = "Ride started"
    static let RIDER_RIDE_MISSED = "Ride missed"
    static let RIDER_RIDE_RATED = "Ride rated"
    static let RIDER_DRIVER_ARRIVED = "Driver arrived"
    static let RIDER_DRIVER_PICKED_UP = "Driver picked up"
    static let RIDER_RIDE_COMPLETED = "Driver completed"
    static let RIDER_APP_STORE_RATING_PROMPT = "App Store Rating Prompt"
    static let RIDER_RIDE_CANCELED_REASON = "Ride canceled reason"
    static let RIDER_RIDE_RATING_REASON = "Ride rating reason"
    static let RIDER_PAYMENT_METHOD_ADDED = "Payment method added"
    static let RIDER_PAYMENT_METHOD_REMOVED = "Payment method removed"
    static let RIDER_PROMOCODE_ADDED = "Promocode added"
    static let RIDER_PROMOCODE_REMOVED = "Promocode removed"
    static let RIDER_RIDE_QUOTE_CONFIRMED = "Ride quote confirmed"
    static let RIDER_RIDE_QUOTE_CANCELED = "Ride quote canceled"
    static let RIDER_PAYMENT_FAILED = "Ride payment failed"
    static let RIDER_PAYMENT_SETUP_FAILED = "Ride payment setup failed"
    static let RIDER_RIDE_AD_CLICK = "Ride advertisement clicked"
    static let RIDER_RIDE_TIP_CHARGED = "Ride tip charged"
    static let RIDER_PWYW_MORE_INFO = "PWYW more info tapped"
    
    static let RIDER_SIGNUP_STEP_1 = "Sign up step 1 completed"
    static let RIDER_SIGNUP_STEP_2 = "Sign up step 2 completed"
    static let RIDER_SIGNUP_STEP_3 = "Sign up step 3 completed"
    static let RIDER_SIGNUP_SUCCESSFUL = "Sign up successful"
    static let RIDER_PHONE_NUMBER_CONFIRMED = "Phone number confirmed"
    
    static let RIDER_SIGNIN_SUCCESSFUL = "Sign in successful"
    static let RIDER_SIGNIN_FORGOT_PWD = "Forgot password clicked"
    
    static let RIDER_EMAIL_VERIFICATION_STARTED = "Email verification started"
    static let RIDER_EMAIL_VERIFICATION_CONFIRMATION = "Email verification confirmed"
    static let RIDER_EMAIL_VERIFICATION_SUBMISSION = "Email verification submitted"
    static let RIDER_EMAIL_VERIFICATION_PASSWORD = "Email verification password confirmed"
    static let RIDER_EMAIL_VERIFICATION_SUCCESSFUL = "Email verification successful"
}

class MixpanelManager {

    private static var mixpanel = Mixpanel.mainInstance()

    static func initialize() {
        if let token = Bundle.main.object(forInfoDictionaryKey: "Mixpanel token") as? String {
            Mixpanel.initialize(token: token, trackAutomaticEvents: true)
        }
    }
    
    static func incrementUserTipValue(value: Int) {
        mixpanel.people.increment(property: "tips total", by: Double(value))
    }
    
    static func incrementUserPaymentValue(value: Int) {
        Mixpanel.mainInstance().people.increment(property: "payments total", by: Double(value))
    }

    static func checkPermissionAndIdentifyUser(_ user: User) {
        #if RIDER
        if #available(iOS 14, *) {
            ATTrackingManager.requestTrackingAuthorization { status in
                if status == .authorized {
                    print("ATT_DEBUG: authorized. identifying user on mixpanel")
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
        mixpanel.identify(distinctId: user.id)
        mixpanel.people.set(properties:
            [
                "$first_name": user.firstName,
                "$last_name": user.lastName,
                "$email": user.email,
                "zip": user.zip,
                "locale": TranslationsManager.getCurrentLanguage()
            ]
        )

        #if RIDER
        if let dateOfBirth = user.dateOfBirth() {
            mixpanel.people.set(properties:["dob": dateOfBirth])
        }
        
        if let verificationDeadline = user.emailVerificationDeadline {
            mixpanel.people.set(properties:["verification_deadline": verificationDeadline])
        }
        #endif
        
        if let phone = user.phone {
            mixpanel.people.set(properties:["$phone": phone])
        }
        
        if let gender = user.gender {
            mixpanel.people.set(properties:["$gender": gender])
        }
    }
    
    static func trackEvent(_ event: String, properties: Properties? = nil) {
        #if RIDER
        let context = RiderAppContext.shared
        #elseif DRIVER
        let context = DriverAppContext.shared
        #endif
        
        var propsToSend: Properties = properties ?? [:]

        if context.currentLocation != nil {
            propsToSend["location"] = context.currentLocation?.name
        }

        if propsToSend.count == 0 {
            mixpanel.track(event: event)
        } else {
            mixpanel.track(event: event, properties: propsToSend)
        }

        // Share events with Bugsnag. It can be helpful to understand what happened before each error.
        Bugsnag.leaveBreadcrumb(withMessage: event)

        Logger.analytics.info("\(event) (\(propsToSend)")
    }

}
