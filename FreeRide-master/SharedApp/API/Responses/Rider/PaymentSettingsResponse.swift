//
//  StripeSetupIntentResponse.swift
//  FreeRide
//
//  Created by Rui Magalhães on 06/04/2020.
//  Copyright © 2020 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct StripePaymentMethod: Codable {
    let paymentMethodId: String
    let last4digits: String
    let cardType: String
}

struct Promocode: Codable {
    let name: String?
    let code: String?
    let type: String?
    let value: Int?
    let isPromocodeValid: Bool
    let promocodeInvalidMessage: String?
    let promocodeUsesLeft: Int?
    let promocodeUsesMax: Int?
    let promocodeExpiryDate: String?
    
    func getTitleWithValue() -> String {
        var title = code ?? ""
        let promoValue = value ?? -1;
        switch type {
        case "percentage":
            title += " - \(promoValue)% \("payments_pc_off".localize())"
            break
        case "value":
            title += " - \(promoValue.toPrice(with: "usd")) \("payments_pc_off".localize())"
            break
        case "full":
            title += " - \("payments_pc_free_rides".localize())"
            break
        default:
            break
        }
        
        return title
    }

    func getInfo() -> String {
        if let invalidMessage = promocodeInvalidMessage, !isPromocodeValid {
            return invalidMessage
        }
        if let promocodeName = name {
            return promocodeName
        }
        return "payments_pc_invalid".localize()
    }
    
    func getAdditionalInfo() -> String {
        var additionalInfo = ""
        if let timesLeft = promocodeUsesLeft, let timesMax = promocodeUsesMax {
            additionalInfo += "\(timesLeft) \("payments_pc_of".localize()) \(timesMax) \("payments_pc_usages_left".localize())."
        }
        if let expiryDate = promocodeExpiryDate {
            additionalInfo += " \("payments_pc_valid_until".localize()) \(expiryDate.utcStringToLocalMonthAndDay())."
        }
        if !additionalInfo.isEmpty {
            additionalInfo = "\n\(additionalInfo)"
        }
        return additionalInfo;
    }
    
}

struct PaymentSettingsResponse: Codable {

    let stripeCustomerId: String
    let stripePaymentMethods: [StripePaymentMethod]
    let promocode: Promocode?

    var hasPaymentMethod: Bool {
        return stripePaymentMethods.count > 0
    }

}
