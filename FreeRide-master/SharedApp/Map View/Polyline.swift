//
//  Polyline.swift
//  MapView
//
//  Created by Andrew Boryk on 6/29/18.
//  Copyright © 2018 Rocket n Mouse. All rights reserved.
//

import GoogleMaps

open class Polyline: GMSPolyline {
    
    public enum Transportation: String {
        
        case driving
        case transit
        case walking
    }
    
    public var origin: CLLocationCoordinate2D?
    public var destination: CLLocationCoordinate2D?
    public var transportation: Transportation = .driving
    
    public init(origin: CLLocationCoordinate2D, destination: CLLocationCoordinate2D, transportation: Transportation = .driving) {
        self.origin = origin
        self.destination = destination
        self.transportation = transportation
    }
    
    public func fetchPath(completion: @escaping (GMSPath?) -> Void) {
        loadPathData { data in
            DispatchQueue.main.async {
                if let data = data,
                    let response = try? JSONDecoder().decode(GoogleDirectionsResponse.self, from: data),
                    let route = response.routes.first {
                        self.path = GMSPath(fromEncodedPath: route.polyline.points)
                        completion(self.path)
                    } else {
                        completion(nil)
                    }
            }
        }
    }
    
    private func loadPathData(completion: @escaping (Data?) -> Void) {
        guard let origin = origin, let destination = destination, let mapsAPIKey = Bundle.main.object(forInfoDictionaryKey: "Maps Polyline API Key") as? String else {
            return
        }
        
        let base = "https://maps.googleapis.com/maps/api/directions/json"
        let originComponent = "origin=\(origin.latitude),\(origin.longitude)"
        let destinationComponent = "destination=\(destination.latitude),\(destination.longitude)"
        let modeComponent = "mode=\(transportation.rawValue)"
        let apiKey = "key=\(mapsAPIKey)"
        let urlString =  "\(base)?\(originComponent)&\(destinationComponent)&\(modeComponent)&\(apiKey)"
        
        guard let url = URL(string: urlString) else {
            completion(nil)
            return
        }
        
        let session = URLSession(configuration: .default)
        session.dataTask(with: url) { (data, _, _) in
            completion(data)
            }.resume()
    }
}
