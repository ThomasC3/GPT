//
//  StopTypeResponse.swift
//  FreeRide
//

import Foundation

struct StopTypeResponse: Codable {

    struct Stop: Codable {
        let latitude: Float
        let longitude: Float
        let name: String?
        let address: String?
        let id: String?
    }
    
    let isFixedStop: Bool?
    let stop: Stop?
}
