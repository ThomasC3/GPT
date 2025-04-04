//
//  EmailVerificationRequest.swift
//  FreeRide
//

import Foundation

struct EmailVerificationRequest: Codable {
    
    let email: String
    let code: String
}
