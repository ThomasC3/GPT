//
//  RequestRideResponse.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct RequestRideResponse: Codable {
    
    let location: String
    let origin: Address
    let destination: Address
    let isADA: Bool
    let passengers: Int
    let paymentInformation: PaymentInformation?
    let waitingPaymentConfirmation: Bool?
    let requestTimestamp: String
}

struct PaymentInformation: Codable {
    let status: String?
    let clientSecret: String?
    
    let totalPrice: Int
    let ridePrice: Int?
    let pricePerHead: Int?
    let capEnabled: Bool?
    let priceCap: Int?
    let currency: String
    let totalWithoutDiscount: Int?
    let discount: Int?
    let promocodeCode: String?
    let isPromocodeValid: Bool?
    let promocodeInvalidMessage: String?
    let promocodeUsesLeft: Int?
    let promocodeUsesMax: Int?
    let promocodeExpiryDate: String?
    let promocodeName: String?
    
    func getShortQuoteInfo() -> String {
        var quoteInfo = "payments_total_ride_cost".localize()
    
        if totalPrice == 0 {
            quoteInfo = "your_ride_will_be_free".localize()
        } else {
            quoteInfo += " \(totalPrice.toPrice(with: currency))"
        }
        
        if let discount = discount, let isValid = isPromocodeValid, discount > 0, isValid {
            quoteInfo += ", \("payments_including".localize()) \(discount.toPrice(with: currency)) \("payments_of_discount".localize())"
        }
        
        return quoteInfo
    }
    
    func getQuoteInfo() -> String {
        var quoteInfo = self.getShortQuoteInfo()
        
        if let promocode = promocodeCode, let isValid = isPromocodeValid, isValid {
            quoteInfo += " \("payments_using".localize()) \(promocode)"
            
            if let timesLeft = promocodeUsesLeft, let timesMax = promocodeUsesMax {
                quoteInfo += ". \(timesLeft) \("payments_pc_of".localize()) \(timesMax) \("payments_pc_usages_left".localize())"
            }
            if let expiryDate = promocodeExpiryDate {
                quoteInfo += ". \("payments_pc_valid_until".localize()) \(expiryDate.utcStringToLocalMonthAndDay())"
            }
        }
                
        quoteInfo += "payments_quote_info".localize()
        
        return quoteInfo
    }
}
