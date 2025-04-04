//
//  EmailVerificationReqRequest.swift
//  FreeRide
//

import Foundation

struct EmailVerificationReqRequest: Codable {
    
    let email: String
    let password: String
}
