//
//  GoogleDirectionsReponse.swift
//  MapView
//
//  Created by Andrew Boryk on 6/29/18.
//  Copyright © 2018 Rocket n Mouse. All rights reserved.
//

import Foundation

struct GoogleDirectionsResponse: Decodable {
    
    let routes: [GoogleDirectionsRoute]
}

struct GoogleDirectionsRoute: Decodable {
    
    let polyline: GoogleDirectionsPolyline
    
    private enum CodingKeys: String, CodingKey {
        case polyline = "overview_polyline"
    }
}

struct GoogleDirectionsPolyline: Decodable {
    
    let points: String
}
