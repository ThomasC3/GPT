//
//  DriverHomeViewController.swift
//  DriverApp
//
//  Created by Andrew Boryk on 12/18/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit
import GoogleMaps
import CoreLocation
import OSLog

extension Notification.Name {

    static let shouldUpdateActions = Notification.Name(rawValue: "shouldUpdateActions")
    static let shouldUpdateRideMessages = Notification.Name(rawValue: "shouldUpdateRideMessages")
}

class DriverHomeViewController: HomeViewController {
    
    private lazy var vehicleCheckOutBottomView: VehicleCheckOutBottomView = {
        let view: VehicleCheckOutBottomView = .instantiateFromNib()
        view.translatesAutoresizingMaskIntoConstraints = false
        view.delegate = self
        return view
    }()
    
    private lazy var driverStatusBottomView: DriverStatusBottomView = {
        let view: DriverStatusBottomView = .instantiateFromNib()
        view.translatesAutoresizingMaskIntoConstraints = false
        view.delegate = self
        return view
    }()

    private lazy var currentRideView: CurrentRideBottomView = {
        let view: CurrentRideBottomView = .instantiateFromNib()
        view.translatesAutoresizingMaskIntoConstraints = false
        view.delegate = self
        return view
    }()
    
    private lazy var actionGroupView: ActionGroupBottomView = {
        let view: ActionGroupBottomView = .instantiateFromNib()
        view.translatesAutoresizingMaskIntoConstraints = false
        view.delegate = self
        return view
    }()

    private lazy var rideNotificationView: RideNotificationView = {
        let view: RideNotificationView = .instantiateFromNib()
        view.translatesAutoresizingMaskIntoConstraints = false
        view.delegate = self
        return view
    }()

    private var currentAction: Action? {
        return context.dataStore.fetchCurrentAction()
    }

    private var isSilentlyRefreshingActions = false
    private var driverMovedTimer: Timer?
    private var removeNotificationTimer: Timer?
    private var notificationFeedback = UINotificationFeedbackGenerator()
    private var driverPathPolyline: GMSPolyline?
    private var lastCurrentRideID: String?
    private var shouldShowNewActionAlert = false
    private var fetchingActions = false

    override func viewDidLoad() {
        rightNavigationStyle = .custom(#imageLiteral(resourceName: "round_departure_board_black_24pt"))
        rightNavigationAction = .custom({
            let vc = CurrentRidesViewController()
            self.navigationController?.pushViewController(vc, animated: true)
        })

        super.viewDidLoad()

        mapView.delegate = self

        topView.verticalStackView.spacing = 10
        context.socket.delegate = self

        onAppReconnect()
        
        Notification.addObserver(self, name: .didUpdateDriverStatus, selector: #selector(updateCurrentAction))
        Notification.addObserver(self, name: .shouldUpdateActions, selector: #selector(updateActions))
        Notification.addObserver(self, name: .didCheckOutVehicle, selector: #selector(startServiceSelection))
        Notification.addObserver(self, name: .didCompleteCheckOutInspection, selector: #selector(updateCurrentAction))
        Notification.addObserver(self, name: .didSelectService, selector: #selector(startCheckOutInspection))
        Notification.addObserver(self, name: .didSelectVehicle, selector: #selector(startServiceSelection))
    }
    
    @objc override func onAppResume() {
        super.onAppResume()
        onAppReconnect()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        onAppReconnect()
        NotificationCoordinator.requestPermission()
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        bottomView.isHidden = false
    }
    
    override func onAppReconnect() {
        self.updateActions()
        self.updateDriverLocation()
    }

    override func showConnectivityView() {
        if !connectivityView.isDescendant(of: bottomView.stackView) {
            bottomView.stackView.addArrangedSubview(connectivityView)
            connectivityView.pinHorizontalEdges(to: bottomView, constant: 20)
        }
    }

    override func didUpdateCurrentLocation() {
        super.didUpdateCurrentLocation()
        Notification.post(.didUpdateDriverStatus)
        driverMovedTimer?.invalidate()
        if let interval = context.currentLocation?.driverLocationUpdateInterval {
            driverMovedTimer = Timer.scheduledTimer(timeInterval: TimeInterval(interval), target: self, selector: #selector(updateDriverLocation), userInfo: nil, repeats: true)
        }
    }

    override func handleGeoChanged(latitude: Float, longitude: Float) {
        let emitter = DriverMovedEmitter(latitude: latitude, longitude: longitude)
        context.socket.emit(emitter)
    }
    
    override func fetchCurrentUserDetails() {
        context.api.getDriver() { result in
            switch result {
            case .success(let response):
                self.context.currentUser.update(with: response)
                Notification.post(.didUpdateUserDetails)
                if let activeLocation = response.activeLocation {
                    self.fetchCurrentLocationDetails(locationId: activeLocation)
                } else {
                    self.setActiveLocationBasedOnGPSCoordinates()
                }
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }

    private func setActiveLocationBasedOnGPSCoordinates() {
        fetchNearestLocationBasedOnGPSCoordinates { locationResponse in
            if let nearestLocation = locationResponse {
                let request = SetLocationRequest(activeLocation: nearestLocation.id)
                self.context.api.setDriverActiveLocation(request) { result in
                    switch result {
                    case .success(_):
                        // Force Driver to update local data
                        self.fetchCurrentUserDetails()
                    case .failure(let error):
                        self.presentAlert(for: error)
                    }
                }
            } else if self.context.currentLocation == nil {
                self.presentAlert("Locations Unavailable".localize(), message: "There are no rides available at this time.".localize())
            }
        }
    }

    private func updateMarkers() {
        mapView.clearMarkers()

        if let action = currentAction {
            if action.isInProgress, action.destinationAddress != nil {
                let coordinate = CLLocationCoordinate2D(latitude: action.destinationLatitude, longitude: action.destinationLongitude)
                let marker = mapView.addMarker(position: coordinate, icon: #imageLiteral(resourceName: "dropoffActive"), animated: true)
                marker.isDraggable = false
                marker.userData = "destination"
                marker.tracksInfoWindowChanges = true
            } else if action.originAddress != nil {
                let coordinate = CLLocationCoordinate2D(latitude: action.originLatitude, longitude: action.originLongitude)
                let marker = mapView.addMarker(position: coordinate, icon: #imageLiteral(resourceName: "pickupActive"), animated: true)
                marker.isDraggable = false
                marker.userData = "origin"
                marker.tracksInfoWindowChanges = true
            }
        }

        if driverPathPolyline == nil {
            updateCamera()
        }
    }

    private func clearRidePolyline() {
        guard let driverPathPolyline = driverPathPolyline,
            let id = driverPathPolyline.userData as? String,
            id == currentAction?.id else {
                self.driverPathPolyline?.map = nil
                self.driverPathPolyline = nil
                return
        }
    }
    
    @objc private func startServiceSelection(_ notification: Notification) {
        guard let vehicle = notification.value as? VehicleResponse else {
            return
        }
        let vc = ServicesViewController()
        vc.vehicleId = vehicle.id
        vc.serviceList = vehicle.services
        self.present(vc, animated: true)
    }
    
    @objc private func startCheckOutInspection(_ notification: Notification) {
        guard let values = notification.value as? [String: String] else {
            return
        }
        let vc = VehicleInspectionViewController()
        vc.vehicleId = values["vehicleId"]
        vc.serviceKey = values["serviceKey"]
        self.present(vc, animated: true)
    }
    
    @objc private func startCheckInInspection() {
        guard let vehicle = context.currentVehicle else {
            return
        }
        let vc = VehicleInspectionViewController()
        vc.vehicleId = vehicle.id
        self.present(vc, animated: true)
    }
    
    @objc private func startVehicleSelection() {
        let vc = VehiclesViewController()
        self.present(vc, animated: true)
    }
    

    @objc private func updateCurrentAction() {
        updateMarkers()
        updateInfoViews()
        clearRidePolyline()
        removeBottomArrangedSubviews()
        
        let actions = context.dataStore.fetchCurrentActions()
        let actionGroups = context.dataStore.fetchActionGroups()
        
        let fleetEnabled = context.currentLocation?.fleetEnabled ?? false

        if let rideID = rideNotificationView.rideID {
            if context.dataStore.fetchAction(rideId: rideID) == nil {
                removeTopArranged(subviews: [rideNotificationView])
            }
        }
        
        if let action = currentAction {
            
            if let lastCurrentRideID = lastCurrentRideID, lastCurrentRideID != action.rideId, shouldShowNewActionAlert {
                showNewActionAlert()
            }
            
            shouldShowNewActionAlert = false
            var currentActionGroup : [Action] = []
            for group in actionGroups {
                if group.contains(where: { $0.rideId == action.rideId }) {
                    currentActionGroup = group
                    break
                }
            }
            
            //todo: check if this fixed stop enabled check is really necessary
            if /*fixedStopEnabled &&*/ !action.isHailed && currentActionGroup.count > 1 {
                actionGroupView.configure(with: currentActionGroup)
                if action.isDriverArrived && action.driverArrivedTimestamp != nil {
                    actionGroupView.showTimer(with: action.driverArrivedTimestamp!)
                }
                bottomView.stackView.addArrangedSubview(actionGroupView)
                actionGroupView.pinHorizontalEdges(to: bottomView, constant: 20)
            } else {
                currentRideView.configure(with: action)
                if action.isDriverArrived && action.driverArrivedTimestamp != nil {
                    currentRideView.showTimer(with: action.driverArrivedTimestamp!)
                }
                bottomView.stackView.addArrangedSubview(currentRideView)
                currentRideView.pinHorizontalEdges(to: bottomView, constant: 20)
            }
        } else {
            if fleetEnabled {
                if (context.currentVehicle == nil) {
                    bottomView.stackView.addArrangedSubview(vehicleCheckOutBottomView)
                    vehicleCheckOutBottomView.configure(with: context.currentLocation)
                    vehicleCheckOutBottomView.pinHorizontalEdges(to: bottomView, constant: 20)
                } else {
                    bottomView.stackView.addArrangedSubview(driverStatusBottomView)
                    driverStatusBottomView.pinHorizontalEdges(to: bottomView, constant: 20)
                    driverStatusBottomView.configure(with: context.currentUser.isAvailable, vehicle: context.currentVehicle)
                }
            }
        }

        lastCurrentRideID = currentAction?.rideId

        var etaString = ""
        for action in actions {
            if(action.eta != nil) {
                let formatter = DateFormatter()
                formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
                if let actionEtaDate = formatter.date(from: action.eta!) {
                    let formatterPrint = DateFormatter()
                    formatterPrint.dateFormat =  "h:mm a"
                    etaString = "\nFinishing at \(formatterPrint.string(from: actionEtaDate))"
                }
            }
        }
        
        let stopCount = actionGroups.count
        if stopCount > 0 {
            topView.rightNavigationButton.isHidden = false
            let ridersString = "\(stopCount) Stop\(stopCount == 1 ? "" : "s")"
            title = "\(ridersString) Left in Queue\(etaString)"
        } else {
            if fleetEnabled && context.currentVehicle == nil {
                topView.rightNavigationButton.isHidden = true
                title = "No vehicle checked out"
                return
            }
            
            guard let currentUser = context.dataStore.currentUser() else {
                topView.rightNavigationButton.isHidden = true
                title = ""
                return
            }
            
            topView.rightNavigationButton.isHidden = false
            title = currentUser.isAvailable ? "Queue is clear" : "You're unavailable"
        }
    }
    
    override func fetchDriverActions() {
        updateActions()
    }
    
    @objc private func updateActions() {
        if fetchingActions {
            return
        }
        
        if !isSocketDisconnected && !isSilentlyRefreshingActions {
            ProgressHUD.show()
        }
        
        fetchingActions = true
        context.api.getActions { result in
            self.fetchingActions = false
            switch result {
            case .success(let responses):
                let ds = self.context.dataStore
                ds.wipeCurrentActions()
                ds.wipeCurrentRides()
               
                for (index, response) in responses.enumerated() {
                    let action = Action(context: ds.mainContext)
                    action.update(with: response)
                    action.index = Int32(index)
                }

                ds.save()

                Notification.post(.shouldUpdateCurrentRidesQueue)
            case .failure(let error):
                self.presentAlert(for: error)
            }
                
            self.updateCurrentAction()
            ProgressHUD.dismiss()
            self.isSilentlyRefreshingActions = false
//            self.getCurrentDriverStatus()
        }
    }
    
    @objc private func delayedSound() {
        NotificationCoordinator.playSound(.CarHonk)
    }

    private func showNewActionAlert() {
        let alert = UIAlertController(title: "New Ride Added", message: "You have one new rider to pick up and the route was changed.", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Ok, I understand!", style: .cancel, handler: { _ in
        }))
        present(alert, animated: true, completion: {
            NotificationCoordinator.playSound(.RideChanged)
        })
    }

    private func showNotification(for response: RideReceivedResponse) {
        removeTopArranged(subviews: [rideNotificationView])
        rideNotificationView.configure(with: response)
        topView.verticalStackView.addArrangedSubview(rideNotificationView)
        rideNotificationView.pinHorizontalEdges(to: topView.verticalStackView, constant: 20)
        notificationFeedback.notificationOccurred(.success)
        NotificationCoordinator.playSound(.CarHonk)
        removeNotificationTimer?.invalidate()
        removeNotificationTimer = nil
        removeNotificationTimer = Timer.scheduledTimer(withTimeInterval: 10, repeats: false, block: { _ in
            self.removeTopArranged(subviews: [self.rideNotificationView])
            self.removeNotificationTimer?.invalidate()
            self.removeNotificationTimer = nil
        })
    }

    private func showNotification(for ride: Ride, style: RideNotificationView.Style) {
        removeTopArranged(subviews: [rideNotificationView])
        rideNotificationView.configure(with: ride, style: style)
        topView.verticalStackView.addArrangedSubview(rideNotificationView)
        rideNotificationView.pinHorizontalEdges(to: topView.verticalStackView, constant: 20)
        notificationFeedback.notificationOccurred(.success)
        switch style {
        case .message, .contact:
            NotificationCoordinator.playSound(.Message)
        case .added:
            NotificationCoordinator.playSound(.CarHonk)
        }
        removeNotificationTimer?.invalidate()
        removeNotificationTimer = nil
        removeNotificationTimer = Timer.scheduledTimer(withTimeInterval: 10, repeats: false, block: { _ in
            self.removeTopArranged(subviews: [self.rideNotificationView])
            self.removeNotificationTimer?.invalidate()
            self.removeNotificationTimer = nil
        })
    }

    @objc func updateDriverLocation() {
        guard let latitude = Defaults.userLatitude?.rounded(toPlaces: 8),
            let longitude = Defaults.userLongitude?.rounded(toPlaces: 8) else {
            return
        }
        let emitter = DriverMovedEmitter(latitude: latitude, longitude: longitude)
        context.socket.emit(emitter)
    }

    private func addInfoView(for marker: GMSMarker, info: Address?) {
        guard let info = info else {
            return
        }
        let infoView: MarkerInfoView = .instantiateFromNib()
        infoView.isOrigin = (marker.userData as? String) == "origin"
        infoView.isHidden = true
        infoView.configure(title: info.address)
        addInfoView(infoView, for: marker)
    }

    private func showMessenger(forRide rideID: String) {
        guard let action = context.dataStore.fetchAction(rideId: rideID) else {
            return
        }
        
        let ride = Ride(context: self.context.dataStore.mainContext)
        ride.update(with: action)
        
        let vc = MessengerViewController()
        vc.ride = ride

        let navVC = NavigationController(rootViewController: vc)
        present(navVC, animated: true)
    }
}

extension DriverHomeViewController: GMSMapViewDelegate {

    func mapView(_ mapView: GMSMapView, didChange position: GMSCameraPosition) {
        updateInfoViews()
    }

    func mapView(_ mapView: GMSMapView, didTap marker: GMSMarker) -> Bool {
        updateInfoViews(didTap: true)
        return true
    }

    private func updateInfoViews(didTap: Bool = false) {
        mapView.markers.forEach {
            if let userData = $0.userData as? String {
                let isOrigin = userData == "origin"

                if let infoView = infoViews.first(where: { $0.isOrigin == isOrigin }) {
                    infoView.updatePosition(mapView: mapView, marker: $0)

                    if didTap {
                        infoView.isHidden = !infoView.isHidden
                    }

                    if let currentLocation = context.currentLocation {
                        infoView.isAvailable = currentLocation.serviceAreaBounds.contains($0.position)
                    }
                } else {
                    if let action = currentAction,
                        let originAddress = action.originAddressShort,
                        let destinationAddress = action.destinationAddressShort {
                        let originAddress = Address(address: originAddress, latitude: action.originLatitude, longitude: action.originLongitude, fixedStopId: action.fixedStopId)
                        let destinationAddress = Address(address: destinationAddress, latitude: action.destinationLatitude, longitude: action.destinationLongitude, fixedStopId: action.fixedStopId)
                        addInfoView(for: $0, info: isOrigin ? originAddress : destinationAddress)
                    }
                }
            }
        }
    }
}

extension StackViewController {
    func sendRideUpdate(for resourceID: String, isPickupStop: Bool, driverArrived: Bool, isFixedStop: Bool) {
        var mpEvent = ""
        let query = UpdateRideQuery(id: resourceID)
        let completionHandler: (ServiceResult<UpdateRideResponse>) -> Void = {result in
            ProgressHUD.dismiss()
            self.fetchDriverActions()
            
            switch result {
            case .success/*(let response)*/:
                //self.presentAlert("", message: response.message)
                break
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
        if isPickupStop {
            if driverArrived {
                ProgressHUD.show()
                if isFixedStop {
                    self.context.api.requestFixedStopPickup(query: query, completion: completionHandler)
                } else {
                    self.context.api.requestRidePickup(query: query, completion: completionHandler)
                }
            } else {
                ProgressHUD.show()
                if isFixedStop {
                    self.context.api.requestFixedStopDriverArrived(query: query, completion: completionHandler)
                } else {
                    self.context.api.requestRideDriverArrived(query: query, completion: completionHandler)
                }
            }
            mpEvent = driverArrived ? MixpanelEvents.DRIVER_RIDE_PICK_UP : MixpanelEvents.DRIVER_RIDE_DRIVER_ARRIVED
        } else {
            ProgressHUD.show()
            if isFixedStop {
                self.context.api.requestFixedStopDropoff(query: query, completion: completionHandler)
            } else {
                self.context.api.requestRideDropoff(query: query, completion: completionHandler)
            }
            mpEvent = MixpanelEvents.DRIVER_RIDE_COMPLETED
        }
        
        MixpanelManager.trackEvent(mpEvent,
            properties: [
                (isFixedStop ? "ride_id" : "fixed_stop_id") : resourceID
            ]
        )
    }
    
    func sendRideCancel(for resourceID: String, driverArrived: Bool) {
        var mpEvent = ""
        if driverArrived {
            let alert = UIAlertController(title: "Cancel Ride", message: "Are you sure you want to cancel this Ride while you are waiting to meet the Rider?", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "No", style: .cancel))
            alert.addAction(UIAlertAction(title: "Yes, unable to pick up", style: .destructive, handler: { _ in
                self.askForRiderReport(resourceID: resourceID)
                mpEvent = MixpanelEvents.DRIVER_RIDE_CANCELED
            }))
            alert.addAction(UIAlertAction(title: "Yes, rider no show", style: .destructive, handler: { _ in
                if let latitude = Defaults.userLatitude?.rounded(toPlaces: 8),
                   let longitude = Defaults.userLongitude?.rounded(toPlaces: 8) {
                    ProgressHUD.show()
                    
                    let query = UpdateRideQuery(id: resourceID)
                    let request = CancelRideRequest(noShow: true, latitude: latitude, longitude: longitude)
                    self.context.api.requestRideCancellation(query: query, request: request) { result in
                        ProgressHUD.dismiss()
                        self.fetchDriverActions()
                        
                        switch result {
                        case .success/*(let response)*/:
                            //self.presentAlert("", message: response.message)
                            break
                        case .failure(let error):
                            self.presentAlert(for: error)
                        }
                    }
                    mpEvent = MixpanelEvents.DRIVER_RIDER_NO_SHOW
                } else {
                    self.presentAlert("Canceling ride failed", message: "Unable to determine your current location. Please ensure your location services are enabled and try again.")
                }
            }))
            present(alert, animated: true)
        } else {
            let confirm = UIAlertAction(title: "Yes, cancel ride", style: .destructive) { _ in
                self.askForRiderReport(resourceID: resourceID)
                mpEvent =  MixpanelEvents.DRIVER_RIDE_CANCELED_BEFORE_ARRIVAL
            }
            presentAlert("Cancel Ride", message: "Are you sure you want to cancel this Ride while you are on the way?", cancel: "No", confirm: confirm)
        }
        
        MixpanelManager.trackEvent(mpEvent,
            properties: [
                "ride_id" : resourceID
            ]
        )
    }
    
    func askForRiderReport(resourceID: String) {
        guard let action = context.dataStore.fetchAction(rideId: resourceID) else {
            return
        }
        let ride = Ride(context: self.context.dataStore.mainContext)
        ride.update(with: action)
        let vc = RatingViewController()
        vc.setRide(ride: ride, toReportOnly: true)
        self.emitRideCancel(rideId: resourceID)
        let alert = UIAlertController(title: "Rider Report", message: "Do you also want to report the rider?", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "No", style: .cancel))
        alert.addAction(UIAlertAction(title: "Yes, report rider", style: .destructive) { _ in
            self.navigationController?.pushViewController(vc, animated: true)
        })
        present(alert, animated: true)
    }
    
    func emitRideCancel(rideId: String) {
        ProgressHUD.show()
        
        let query = UpdateRideQuery(id: rideId)
        let request = CancelRideRequest(noShow: false, latitude: nil, longitude: nil)
        
        self.context.api.requestRideCancellation(query: query, request: request) { result in
            ProgressHUD.dismiss()
            self.fetchDriverActions()

            switch result {
            case .success/*(let response)*/:
                //self.presentAlert("", message: response.message)
                break
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }
}

extension DriverHomeViewController: VehicleCheckOutBottomViewDelegate {
    func startVehicleCheckOut() {
        if !context.currentUser.hasActiveLocation {
            presentAlert("Location", message: "Active location not available.")
            return
        }

        self.startVehicleSelection()
    }
}

extension DriverHomeViewController: DriverStatusBottomViewDelegate {
    func checkInVehicle() {
        startCheckInInspection()
    }
}

extension DriverHomeViewController: CurrentRideBottomViewDelegate {

    func didSelectRideUpdate() {
        guard let action = currentAction, let rideId = action.rideId else {
            return
        }
        sendRideUpdate(for: rideId, isPickupStop: action.isPickup, driverArrived: action.status == .driverArrived, isFixedStop: false)
    }

    func didSelectContact() {
        guard let action = currentAction, let rideId = action.rideId else {
            return
        }
        showMessenger(forRide: rideId)
    }

    func didSelectCancel() {
        guard let action = currentAction, let rideId = action.rideId else {
            return
        }
        sendRideCancel(for: rideId, driverArrived: action.status == .driverArrived)
    }
}

extension DriverHomeViewController: ActionGroupBottomViewDelegate {
    func didSelectGroupUpdate(for actionGroup: [Action]) {
        guard let firstAction = actionGroup.first, let fixedStopId = firstAction.fixedStopId else {
            return
        }

        let driverArrived = firstAction.isDriverArrived
        let isPickup = firstAction.isPickup

        if isPickup && !driverArrived {
            self.sendRideUpdate(for: fixedStopId, isPickupStop: isPickup, driverArrived: false, isFixedStop: true)
            return
        }

        if actionGroup.count == 1 {
            guard let rideId = firstAction.rideId else {
                return
            }
            self.sendRideUpdate(for: rideId, isPickupStop: isPickup, driverArrived: driverArrived, isFixedStop: false)
            return
        }
        
        let copyAction = isPickup ? "pick up" : "drop off"

        let alert = UIAlertController(title: "\(actionGroup.count) rides to \(copyAction)", message: "Who do you want to \(copyAction) now?", preferredStyle: .actionSheet)
        alert.addAction(UIAlertAction(title: "\(copyAction.capitalizingFirstLetter()) all rides", style: .destructive , handler:{ (UIAlertAction) in
            self.sendRideUpdate(for: fixedStopId, isPickupStop: isPickup, driverArrived: driverArrived, isFixedStop: true)
        }))
        for action in actionGroup {
            guard let rideId = action.rideId, let riderName = action.riderName else {
                return
            }
            alert.addAction(UIAlertAction(title: "\(copyAction.capitalizingFirstLetter()) \(riderName)", style: .default , handler:{ (UIAlertAction) in
                self.sendRideUpdate(for: rideId, isPickupStop: isPickup, driverArrived: driverArrived, isFixedStop: false)
            }))
        }
        alert.addAction(UIAlertAction(title: "Dismiss", style: .cancel, handler: nil))
        self.present(alert, animated: true, completion: nil)
    }
    
    func didSelectGroupContact(for actionGroup: [Action]) {
        if actionGroup.count == 1 {
            guard let rideId = actionGroup.first?.rideId else {
                return
            }
            self.showMessenger(forRide: rideId)
            return
        }
        let alert = UIAlertController(title: "\(actionGroup.count) rides on the next stop", message: "Who do you want to contact?", preferredStyle: .actionSheet)
        for action in actionGroup {
            guard let rideId = action.rideId, let riderName = action.riderName else {
                return
            }
            alert.addAction(UIAlertAction(title: "Contact \(riderName)", style: .default , handler:{ (UIAlertAction) in
                self.showMessenger(forRide: rideId)
            }))
        }
        alert.addAction(UIAlertAction(title: "Dismiss", style: .cancel, handler: nil))
        self.present(alert, animated: true, completion: nil)
    }
    
    func didSelectGroupCancel(for actionGroup: [Action]) {
        if actionGroup.count == 1 {
            guard let firstAction = actionGroup.first, let rideId = firstAction.rideId else {
                return
            }
            self.sendRideCancel(for: rideId, driverArrived: firstAction.status == .driverArrived)
            return
        }
        let alert = UIAlertController(title: "\(actionGroup.count) rides on the next stop", message: "Which ride do you want to cancel?", preferredStyle: .actionSheet)
        for action in actionGroup {
            guard let rideId = action.rideId, let riderName = action.riderName else {
                return
            }
            alert.addAction(UIAlertAction(title: "Cancel \(riderName)", style: .default , handler:{ (UIAlertAction) in
                self.sendRideCancel(for: rideId, driverArrived: action.status == .driverArrived)
            }))
        }
        alert.addAction(UIAlertAction(title: "Dismiss", style: .cancel, handler: nil))
        self.present(alert, animated: true, completion: nil)
    }
    
}

extension DriverHomeViewController: RideNotificationViewDelegate {

    func didButtonAction(rideID: String, style: RideNotificationView.Style) {
        switch style {
        case .contact:
            call(rideID: rideID)
        case .message:
            showMessenger(forRide: rideID)
        default:
            break
        }
    }

    private func call(rideID: String) {
        guard let action = context.dataStore.fetchAction(rideId: rideID), let phone = action.riderPhone else {
            return
        }

        if let url = URL(string: "tel://\(phone)") {
            if UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url)
            } else {
                presentAlert("Phone Unavailable", message: "This device is unable to call the mobile phone number: \(phone)")
            }
        }
    }
}

extension DriverHomeViewController: DriverSocketDelegate {

    func listenSocketConnected() {
        updateActions()
        isSocketDisconnected = false
        connectivityView.configureSocketStatus(isOnline: true)
        manageConnectivityView()
    }
    
    func listenSocketDisconnected() {
        isSocketDisconnected = true
        connectivityView.configureSocketStatus(isOnline: false)
        manageConnectivityView()
    }

    func listenSocketReconnecting() {
        listenSocketDisconnected()
    }

    func listenSocketError() {
        isSocketDisconnected = true
        connectivityView.configureSocketStatus(isOnline: false)
        manageConnectivityView()
    }

    func listenSocketEventReceived() {
        isSocketDisconnected = false
        if connectivityView.isConnected {
            return
        }
        connectivityView.configureSocketStatus(isOnline: true)
        manageConnectivityView()
    }

    func listenRideReceivedResponse(_ response: RideReceivedResponse) {
        showNotification(for: response)
        
        shouldShowNewActionAlert = true
        isSilentlyRefreshingActions = true
        updateActions()
        
        let emitter = RideRequestReceivedAckEmitter(ride: response.ride)
        context.socket.emit(emitter)
    }

    func listenRideUpdatesResponse(_ response: RideUpdatesResponse) {
        guard let action = context.dataStore.fetchAction(rideId: response.ride) else {
            isSilentlyRefreshingActions = true
            updateActions()
            return
        }
        
        let ride = Ride(context: self.context.dataStore.mainContext)
        ride.update(with: action)

        let previousStatus = ride.status
        let previousIsCancelled = ride.isCancelled

        ride.update(with: response)

        if previousStatus == ride.status {
            return
        }
        
        if ride.isCancelled {
            Logger.rideRequest.debug("🚙 Ride has been cancelled")

            if let riderName = ride.riderName {
                presentAlert("Ride Cancelled", message: "Your ride with \(riderName) has been cancelled.")
            } else {
                presentAlert("Ride Cancelled", message: "Your ride has been cancelled.")
            }

            notificationFeedback.notificationOccurred(.error)

            if !previousIsCancelled {
                NotificationCoordinator.playSound(.RideCancelled)
            }
        } else if ride.isComplete, ride.riderName != nil {
            Logger.rideRequest.debug("🚙 Ride has finished")
            if self.navigationController?.isControllerOnStack(ofClass: RatingViewController.self) == .some(false) {
                let vc = RatingViewController()
                vc.setRide(ride: ride)
                navigationController?.pushViewController(vc, animated: true)
            }
        }

        driverPathPolyline?.map = nil
        driverPathPolyline = nil
        isSilentlyRefreshingActions = true
        updateActions()

        Notification.post(.shouldUpdateCurrentRidesQueue)
    }

    func listenRideMessageReceived(_ response: RideMessageReceived) {
        guard let action = context.dataStore.fetchAction(rideId: response.ride) else {
            return
        }
        
        let ride = Ride(context: self.context.dataStore.mainContext)
        ride.update(with: action)

        Logger.rideRequest.debug("🚙 Ride has been updated")

        Notification.post(.shouldUpdateRideMessages)
        showNotification(for: ride, style: .message)
        updateCurrentAction()
    }

    func listenRideCallRequested(_ response: RideCallRequested) {
        guard let action = context.dataStore.fetchAction(rideId: response.ride) else {
            return
        }
        
        let ride = Ride(context: self.context.dataStore.mainContext)
        ride.update(with: action)

        Logger.rideRequest.debug("📞 Call has been requested by the rider")

        showNotification(for: ride, style: .contact)
        updateCurrentAction()
    }

    func listenWSErrorResponse(_ response: WSErrorResponse) {
        if (!response.messageOnBlackList()) {
            presentAlert("WebSocket Error", message: response.message)
        }
    }

}
