//
//  PaymentConfirmationResponse.swift
//  FreeRide
//

import Foundation

struct TipIntentResponse: Codable {

    let paymentIntentId: String?
    let clientSecret: String?
    let status: String?
    
}
