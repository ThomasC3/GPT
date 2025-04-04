//
//  RouteStorage.swift
//  FreeRide
//

class RouteStorage {
    static let shared = RouteStorage()
    private init() {}
    
    private var _originLat: Float?
    private var _originLon: Float?
    private var _destinationLat: Float?
    private var _destinationLon: Float?
    
    var hasRoute: Bool {
        return _originLat != nil && _originLon != nil &&
               _destinationLat != nil && _destinationLon != nil
    }
    
    var originLat: Float? {
        return _originLat
    }
    
    var originLon: Float? {
        return _originLon
    }
    
    var destinationLat: Float? {
        return _destinationLat
    }
    
    var destinationLon: Float? {
        return _destinationLon
    }
    
    func setRoute(originLat: Float, originLon: Float,
                  destinationLat: Float, destinationLon: Float) {
        self._originLat = originLat
        self._originLon = originLon
        self._destinationLat = destinationLat
        self._destinationLon = destinationLon
    }
    
    func clearRoute() {
        _originLat = nil
        _originLon = nil
        _destinationLat = nil
        _destinationLon = nil
    }
}
