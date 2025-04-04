//
//  PaymentCaptureResponse.swift
//  FreeRide
//

import Foundation

struct PaymentCaptureResponse: Codable {

    let paymentIntentId: String
    let amount: Int
    let currency: String
    let status: String
    let amount_capturable: Int
    let amount_received: Int
}
