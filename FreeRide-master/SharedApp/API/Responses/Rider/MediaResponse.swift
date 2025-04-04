//
//  MediaResponse.swift
//  FreeRide
//

import Foundation

struct MediaResponse: Codable {

    struct MediaItem: Codable {
        let id: String
        let sourceUrl: String
        let url: String
        let advertiserId: String
        let advertisementId: String
        let campaignId: String
        let featured: Bool?
    }
    
    let mediaList: [MediaItem]?
}
