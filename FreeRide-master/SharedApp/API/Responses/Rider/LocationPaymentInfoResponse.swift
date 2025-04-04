//
//  LocationPaymentInfoResponse.swift
//  FreeRide
//

import Foundation

enum PaymentType: String, Codable {
    case free
    case paid
}

enum PaymentSubType: String, Codable {
    case paymentDisabled
    case ageRestriction
    case pwyw
    case fixedPayment
}

struct LocationPaymentInfo: Codable {
    let ridePrice: Int?
    let capEnabled: Bool?
    let priceCap: Int?
    let pricePerHead: Int?
    let currency: String?
    let pwywOptions: [Int]?
    let maxCustomValue: Int?
    let pwywCopy: String?
}

struct LocationPaymentInfoResponse: Codable {
    let type: PaymentType
    let subType: PaymentSubType
    let paymentInformation: LocationPaymentInfo?
    let poweredByCopy: String?
}
