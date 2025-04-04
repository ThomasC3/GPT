//
//  OfflineDriversResponse.swift
//  FreeRide
//

import Foundation

struct OfflineDriversResponse: Codable {

    let total: Int
    let items: [DriverResponse]
    let skip: Int
    let limit: Int
    
    init(total: Int, items: [DriverResponse], skip: Int, limit: Int) {
        self.total = total
        self.items = items
        self.skip = skip
        self.limit = limit
    }
    
}
