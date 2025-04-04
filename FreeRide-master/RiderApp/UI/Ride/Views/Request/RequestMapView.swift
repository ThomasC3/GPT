//
//  RequestMapView.swift
//  FreeRide
//

import UIKit
import GoogleMaps



class RequestMapView: UIView {

    @IBOutlet weak var routeLabel: Label!
    @IBOutlet private weak var mapView: MapView!
    
    var routeDesc = ""
    
    override func awakeFromNib() {
        super.awakeFromNib()
        constrainHeight(250)
        routeLabel.style = .subtitle3darkgray
        if let styleURL = Bundle.main.url(forResource: "map_style", withExtension: "json") {
            mapView.styleMapUsing(fileAt:styleURL) {_ in }
        }
    }
    
    func setLocations(pickup: Address?, dropoff : Address?) {
        
        guard let pickup = pickup, let dropoff = dropoff else {
            return
        }
        
        routeDesc = "\("ride_from".localize()) \(pickup.addressShort ?? "") \("ride_to".localize()) \(dropoff.addressShort ?? "")."
        
        routeLabel.text = routeDesc
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            if self.mapView != nil {
                let pickupCoordinate = CLLocationCoordinate2D(latitude: pickup.latitude, longitude: pickup.longitude)
                let pickupMarker = self.mapView.addMarker(position: pickupCoordinate, icon: #imageLiteral(resourceName: "pickupActive"), animated: true)
                pickupMarker.isDraggable = false
                
                let dropoffCoordinate = CLLocationCoordinate2D(latitude: dropoff.latitude, longitude: dropoff.longitude)
                let dropoffMarker = self.mapView.addMarker(position: dropoffCoordinate, icon: #imageLiteral(resourceName: "dropoffActive"), animated: true)
                dropoffMarker.isDraggable = false
                
                self.mapView.updateCameraToShowAllMarkers(padding: 80)
            }
        }
    }

}
