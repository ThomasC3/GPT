//
//  StripeManager.swift
//  FreeRide
//

import Foundation
import Stripe

class StripeManager {
    
    static func initialize() {
        if let stripeKey = Bundle.main.object(forInfoDictionaryKey: "Stripe PK") as? String {
            StripeAPI.defaultPublishableKey = stripeKey
        }
    }
    
}
