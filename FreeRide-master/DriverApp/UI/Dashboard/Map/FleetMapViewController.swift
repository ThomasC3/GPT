//
//  FleetMapViewController.swift
//  FreeRide
//

import UIKit
import GoogleMaps

class FleetMapViewController: StackViewController {
 
    var polygon: GMSPolygon?
    var polyline: GMSPolyline?
    
    let mapView: MapView = {
        let view = MapView()
        view.settings.myLocationButton = false
        view.backgroundColor = Theme.Colors.backgroundGray
        return view
    }()
    
    
    override func viewDidLoad() {
        super.viewDidLoad()
        leftNavigationAction = .pop(true)
        leftNavigationStyle = .back
        
        rightNavigationStyle = .custom(#imageLiteral(resourceName: "round_person_off_black_36pt"))
        rightNavigationAction = .custom({
            let vc = FleetDriversViewController()
            self.present(vc, animated: true)
        })

        title = "See Offline Drivers"
        
        stackView.addSubview(mapView)
        mapView.translatesAutoresizingMaskIntoConstraints = false
        mapView.pinEdges(to: view)
        middleStackView.isUserInteractionEnabled = false
        stackView.sendSubviewToBack(mapView)
        
        getDrivers()
    }
    
    func getDrivers() {
        ProgressHUD.show()
        context.api.getLoggedInDrivers() { result in
            switch result {
            case .success(let response):
                if response.isEmpty {
                    self.presentAlert("No Drivers", message: "There are no drivers online right now")
                } else {
                    self.getDriverPositions(onlineDrivers: response)
                }
            case .failure(let error):
                self.presentAlert(for: error)
            }
            ProgressHUD.dismiss()
        }
    }

    
    func getDriverPositions(onlineDrivers: [DriverResponse]) {
        guard let location = context.dataStore.currentLocation() else {
            return
        }
        
        let currentDriverId = context.dataStore.currentUser()?.id ?? ""

        drawGeoFence(from: location)
        
        for driver in onlineDrivers {
            
            let isCurrentDriver = driver.id == currentDriverId
            
            let destinationCoordinate = CLLocationCoordinate2D(latitude: driver.currentLocation.latitude, longitude: driver.currentLocation.longitude)
            
            var icon : UIImage
            var description : String
        
            if let vehicle = driver.vehicle {
                if isCurrentDriver {
                    icon = driver.isAvailable ? #imageLiteral(resourceName: "round_airport_shuttle_green_yellow") : #imageLiteral(resourceName: "round_airport_shuttle_red_yellow")
                } else {
                    icon = driver.isAvailable ? #imageLiteral(resourceName: "round_airport_shuttle_green_48pt") : #imageLiteral(resourceName: "round_airport_shuttle_red_48pt")
                }
                description = "\(driver.status)\nUsing \(vehicle.name)"
                if let matchingRule = vehicle.matchingRule {
                    description += "\nMatching Policy: " + matchingRule.title
                }
                if let zones = vehicle.zones {
                    description += "\nZones: " + zones.map({ $0.name }).joined(separator: ", ")
                }
            } else {
                if isCurrentDriver {
                    icon = driver.isAvailable ? #imageLiteral(resourceName: "round_person_black_map_yellow") : #imageLiteral(resourceName: "round_person_unavailable_orange")
                } else {
                    icon = driver.isAvailable ? #imageLiteral(resourceName: "round_person_black_map") : #imageLiteral(resourceName: "round_person_unavailable")
                }
                description = "\(driver.status)\(location.fleetEnabled ? "\nNo vehicle checked out" : "")"
            }
            
            let marker = mapView.addMarker(position: destinationCoordinate, icon: icon, animated: true)
            marker.title = isCurrentDriver ? "You are here" : driver.name
            marker.snippet = description
            marker.isDraggable = false
        }
                
        fitMarkers()
    }
    
    func drawGeoFence(from location: Location) {
        let path = location.serviceAreaPath

        polyline?.map = nil
        polyline = nil

        polyline = GMSPolyline(path: path)
        polyline?.strokeColor = Theme.Colors.kelp
        polyline?.strokeWidth = 2.0
        polyline?.map = mapView
    }
    
    private func fitMarkers() {
        
        if mapView.markers.isEmpty {
            return
        }
        
        var positionsToFit: [CLLocationCoordinate2D] = []
        
        for marker in mapView.markers {
            positionsToFit.append(marker.position)
        }
        
        var bounds = GMSCoordinateBounds()
        positionsToFit.forEach { bounds = bounds.includingCoordinate($0) }
        mapView.updateCamera(to: bounds, insets: UIEdgeInsets(top: 250, left: 40, bottom: 250, right: 40), animated: true)
    }
    
}

