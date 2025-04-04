//
//  PaymentConfirmationResponse.swift
//  FreeRide
//

import Foundation

struct PaymentIntentResponse: Codable {

    let paymentIntentId: String
    let clientSecret: String
    let paymentMethodId: String
    let amount: Int
    let currency: String
    let status: String
    
}
