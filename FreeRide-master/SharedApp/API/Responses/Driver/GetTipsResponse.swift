//
//  GetTipsResponse.swift
//  FreeRide
//

import Foundation

struct GetTipsResponse: Codable {
    let month: String
    let year: Int
    let value: Int
    let fee: Int
    let net: Int
}
