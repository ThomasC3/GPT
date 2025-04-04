//
//  HomeViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/22/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit
import GoogleMaps
import OSLog

class HomeViewController: StackViewController {

    let mapView: MapView = {
        let view = MapView()
        #if RIDER
        if let styleURL = Bundle.main.url(forResource: "map_style", withExtension: "json") {
            view.styleMapUsing(fileAt:styleURL) {_ in }
        }
        #endif
        view.settings.myLocationButton = false
        view.backgroundColor = Theme.Colors.backgroundGray
        return view
    }()

    lazy var connectivityView: ConnectivityView = {
        #if RIDER
        let view = ConnectivityView(margins: .init(top: 0, left: 20, bottom: 20, right: 20))
        #elseif DRIVER
        let view = ConnectivityView()
        #endif
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    lazy var ctaView: CtAView = {
        let view: CtAView = .instantiateFromNib()
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    var polyline: GMSPolyline?
    var isSocketDisconnected = false

    private(set) var infoViews = [MarkerInfoView]()
    private var observer: NSKeyValueObservation?
    var isRefreshingLocation = false
    private var appResumingFlagWorkItem: DispatchWorkItem?
    private var appIsResuming = true
    private var connectivityViewWorkItem: DispatchWorkItem?

    internal var lastLocationServicesEnabled: Bool?
    private var lastUserLocationError: Error? = nil

    override func viewDidLoad() {
        leftNavigationStyle = .custom(#imageLiteral(resourceName: "round_menu_black_48pt"))
        leftNavigationAction = .toggleMenu

        topView.leftNavigationButton.accessibilityIdentifier = "menuNavigationButton"
        topView.rightNavigationButton.accessibilityIdentifier = "actionNavigationButton"

        super.viewDidLoad()

        lastLocationServicesEnabled = CLLocationManager.locationServicesEnabled()
        context.socket.connect()

        #if RIDER

        mapView.isMyLocationEnabled = true

        observer = mapView.observe(\MapView.myLocation, changeHandler: { (mapView, _) in
            guard let coordinate = mapView.myLocation?.coordinate else {
                return
            }

            self.updateUserLocation(coordinate)
        })

        #elseif DRIVER
        
        if !Defaults.isFirstAppSession {
            // Only need to update User Details after the first session.
            fetchCurrentUserDetails()
        }

        mapView.userLocationDelegate = self
        mapView.userLocationIcon = #imageLiteral(resourceName: "DriverCarImage")
        mapView.updateLocationContinuously = true
        mapView.isUserLocationVisible = true

        #endif

        stackView.addSubview(mapView)
        mapView.translatesAutoresizingMaskIntoConstraints = false
        mapView.pinEdges(to: view)

        middleStackView.isUserInteractionEnabled = false

        stackView.sendSubviewToBack(mapView)

        updateCurrentLocation()
        startServerReachabilityListener()
        
        Notification.addObserver(self, name: .applicationWillEnterForeground, selector: #selector(onAppResume))
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)

        #if RIDER
        title = context.currentLocation?.name
        #endif
        
        bottomView.isHidden = true
    }

    @objc func onAppResume() {
        Socket.runtimeLogger?.log(.debug, "App is resuming")
        appResumingFlagWorkItem?.cancel()
        appIsResuming = true
        appResumingFlagWorkItem = DispatchWorkItem { [weak self] in
            Socket.runtimeLogger?.log(.debug, "App resumed")
            self?.appIsResuming = false
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 3, execute: appResumingFlagWorkItem!)

        context.socket.connect()
        lastLocationServicesEnabled = CLLocationManager.locationServicesEnabled()
        fetchCurrentUserDetails()
    }

    func removeTopArranged(subviews: [UIView]) {
        subviews.forEach {
            topView.verticalStackView.removeArrangedSubview($0)
            $0.removeFromSuperview()
        }
    }

    func removeBottomArrangedSubviews() {
        bottomView.stackView.arrangedSubviews.forEach {
            if $0 != connectivityView {
                bottomView.stackView.removeArrangedSubview($0)
                $0.removeFromSuperview()
            }
        }
    }

    func drawGeoFence(with markers: [Marker] = []) {
        guard let location = context.currentLocation,
            !location.serviceArea.isEmpty else {
            return
        }

        let path = location.serviceAreaPath

        polyline?.map = nil
        polyline = nil

        polyline = GMSPolyline(path: path)
        polyline?.strokeColor = Theme.Colors.kelp
        polyline?.strokeWidth = 2.0
        polyline?.map = mapView

        updateCamera()
    }

    func updateCamera() {
        #if DRIVER

        if context.dataStore.fetchCurrentAction()?.riderName == nil {
            let path = polyline?.path ?? GMSPath()
            var bounds = GMSCoordinateBounds(path: path)
            mapView.markers.forEach { bounds = bounds.includingCoordinate($0.position) }
            mapView.updateCamera(to: bounds, insets: UIEdgeInsets(top: 100, left: 40, bottom: 300, right: 40))
        } else {
            var bounds = GMSCoordinateBounds()
            mapView.markers.forEach { bounds = bounds.includingCoordinate($0.position) }
            mapView.updateCamera(to: bounds, insets: UIEdgeInsets(top: 200, left: 40, bottom: 400, right: 40))
        }

        #else

        if context.dataStore.fetchCurrentRide() == nil {
            let path = polyline?.path ?? GMSPath()
            var bounds = GMSCoordinateBounds(path: path)
            mapView.markers.forEach { bounds = bounds.includingCoordinate($0.position) }
            mapView.updateCamera(to: bounds, insets: UIEdgeInsets(top: 200, left: 40, bottom: 250, right: 40))
        } else {
            var bounds = GMSCoordinateBounds()
            mapView.markers.forEach { bounds = bounds.includingCoordinate($0.position) }
            mapView.updateCamera(to: bounds, insets: UIEdgeInsets(top: 200, left: 40, bottom: 250, right: 40))
        }

        #endif
    }

    func addInfoView(_ infoView: MarkerInfoView, for marker: GMSMarker) {
        infoView.updatePosition(mapView: mapView, marker: marker)

        view.addSubview(infoView)
        infoViews.append(infoView)
    }

    func removeInfoViews() {
        infoViews.forEach { $0.removeFromSuperview() }
        infoViews = []
    }
 
    func fetchCurrentLocationDetails(locationId: String) {
        let query = LocationQuery(id: locationId)
        context.api.getLocation(query) { result in
            switch result {
            case .success(let response):
                self.updateCurrentLocation(with: response)
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }

    func fetchNearestLocationBasedOnGPSCoordinates(completion: @escaping (LocationResponse?) -> Void) {
        if lastUserLocationError != nil {
            // Do not continue if there's an error related with user location.
            completion(nil)
            return
        }

        isRefreshingLocation = true

        var query = GetLocationsQuery()

        if let latitude = Defaults.userLatitude,
            let longitude = Defaults.userLongitude {
            query.latitude = latitude.rounded(toPlaces: 8)
            query.longitude = longitude.rounded(toPlaces: 8)
        }
        else {
            completion(nil)
            return
        }

        context.api.getLocations(query) { result in
            self.isRefreshingLocation = false

            switch result {
            case .success(let response):
                completion(response.first)
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }
    
    func fetchCurrentUserDetails() {
        // Override in subclass
    }
    
    func updateCurrentLocation() {
        // Override in subclass
    }

    func handleGeoChanged(latitude: Float, longitude: Float) {
        // Override in subclass
    }
    
    func onAppReconnect() {
        // Override in subclass
    }

    func updateCurrentLocation(with response: LocationResponse) {
        context.dataStore.wipeLocation()

        let location = Location(context: context.dataStore.mainContext)
        location.update(with: response)

        drawGeoFence()
        updateCamera()
        
        #if RIDER
        title = context.currentLocation?.name
        #endif
        
        didUpdateCurrentLocation()
    }

    func updateUserLocation(_ coordinate: CLLocationCoordinate2D) {
        let isFirstTime = Defaults.isFirstAppSession

        let latitude = Float(coordinate.latitude).rounded(toPlaces: 8)
        let longitude = Float(coordinate.longitude).rounded(toPlaces: 8)
        Defaults.userLatitude = latitude
        Defaults.userLongitude = longitude

        #if DRIVER
        if let currentLocation = context.currentLocation {
            if !currentLocation.blockLiveDriverLocation {
                handleGeoChanged(latitude: latitude, longitude: longitude)
            }
        }
        #endif

        if isFirstTime {
            #if RIDER

            if RiderAppContext.shared.dataStore.fetchCurrentRide() == nil {
                updateCurrentLocation()
            }
            updateCamera()

            #elseif DRIVER

            if DriverAppContext.shared.dataStore.fetchCurrentAction() == nil {
                fetchCurrentUserDetails()
            }

            #endif
        }
    }

    func didUpdateCurrentLocation() {
        // Override in subclass
    }
    
    func showConnectivityView() {
        // Override in subclass
    }
    
    func hideConnectivityView() {
        connectivityViewWorkItem?.cancel()
        connectivityViewWorkItem = nil
        connectivityView.removeFromSuperview()
        Socket.runtimeLogger?.log(.info, "HIDE Connectivity view")
    }
    
    func startServerReachabilityListener() {
        Connectivity.sharedManager.startListening { [weak self] status in
            switch status {
            case .unknown:
                Logger.webSockets.info("Connectivity changed to: UNKNOWN")
                Socket.runtimeLogger?.log(.info, "🛜 Connectivity changed to: UNKNOWN")
            case .notReachable:
                Logger.webSockets.info("Connectivity changed to: NOT REACHABLE")
                Socket.runtimeLogger?.log(.info, "🛜 Connectivity changed to: NOT REACHABLE")
                self?.context.socket.disconnect()
            case .reachable:
                Logger.webSockets.info("Connectivity changed to: REACHABLE")
                Socket.runtimeLogger?.log(.info, "🛜 Connectivity changed to: REACHABLE")
                self?.context.socket.connect()
            }
            self?.manageConnectivityView()
        }
    }

    func manageConnectivityView() {
        connectivityView.checkSocketStatus()
        if connectivityView.isConnected {
            hideConnectivityView()
        } 
        else {
            Socket.runtimeLogger?.log(.info, "Attempt to SHOW Connectivity view")
            // Delay the display of the view for 3 seconds to prevent it from rapidly
            //changing between visible and invisible in quick succession.
            connectivityViewWorkItem?.cancel()
            connectivityViewWorkItem = DispatchWorkItem { [weak self] in
                Socket.runtimeLogger?.log(.info, "SHOW Connectivity view")
                self?.showConnectivityView()
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 3, execute: connectivityViewWorkItem!)
        }
    }

}

extension HomeViewController: MapViewUserLocationDelegate {

    func didUpdateUserLocation(_ coordinate: CLLocationCoordinate2D) {
        lastUserLocationError = nil
        updateUserLocation(coordinate)
    }

    func didFailUpdateUserLocation(error: Error) {
        lastUserLocationError = error
        presentAlert(for: ServiceError(error))
    }
    
}
