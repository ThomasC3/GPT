//
//  RiderHomeViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 11/28/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit
import GoogleMaps
import CoreLocation
import GooglePlaces
import Stripe
import OSLog
import SwiftUI

class RiderHomeViewController: HomeViewController {

    var placesClient: GMSPlacesClient!
    var autocompleteSessionToken: GMSAutocompleteSessionToken!
    var currentLocationFetched = false
    var currentRideFetched = false
    var shouldShowLocationAlert = false
    var shouldCheckLatestRide = false
    var requestIsPending = false
    var pendingRequestTimestamp : Date?
    var pendingRequestTimer : Timer?
    var delayedTask = DispatchWorkItem {}
    var messengerNavigationController : NavigationController?
    var markerBeingMoved : String?
    var choosingPickupFS : Bool = false
    
    var rideViewModel: RideViewModel?
    var rideHostingController: UIHostingController<RideSUIView>?

    /// Local bottom stack view with higher priority than the `HomeViewController.bottomView`.
    /// This has no margins compared to the parent `bottomView`.
    lazy var mainBottomStackView: UIStackView = { [unowned self] in
        let stackView = UIStackView()
        stackView.axis = .vertical
        stackView.distribution = .fill
        stackView.alignment = .fill
        stackView.translatesAutoresizingMaskIntoConstraints = false

        self.view.addSubview(stackView)
        stackView.pinHorizontalEdges(to: self.view, constant: 0)
        stackView.pinBottomEdge(to: self.view, constant: 0)

        return stackView
    }()

    private lazy var addressFieldsView: AddressFieldsView = {
        let view: AddressFieldsView = .instantiateFromNib()
        view.delegate = self
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    private lazy var searchTableView: SearchAddressTableView = {
        let view = SearchAddressTableView()
        view.delegate = self
        view.isHidden = true
        view.translatesAutoresizingMaskIntoConstraints = false

        return view
    }()

    private lazy var searchingView: SearchingBottomView = {
        let view: SearchingBottomView = .instantiateFromNib()
        view.delegate = self
        view.translatesAutoresizingMaskIntoConstraints = false

        return view
    }()
    
    private lazy var locationUnavailableView: LocationUnavailableView = {
        let view: LocationUnavailableView = .instantiateFromNib()
        view.translatesAutoresizingMaskIntoConstraints = false
        
        return view
    }()
    
    private lazy var routeBottomView: RouteBottomView = {
        let view: RouteBottomView = .instantiateFromNib()
        view.delegate = self
        view.translatesAutoresizingMaskIntoConstraints = false
        
        return view
    }()
    
    private lazy var quoteBottomView: QuoteBottomView = {
        let view: QuoteBottomView = .instantiateFromNib()
        view.delegate = self
        view.translatesAutoresizingMaskIntoConstraints = false
        
        return view
    }()
    
    private lazy var centerMarkerView: CenterMarkerView = {
        let view = CenterMarkerView()
        let gesture = UITapGestureRecognizer(target: self, action:  #selector(self.centerPinTapAction))
        view.addGestureRecognizer(gesture)
        return view
    }()
    
    private lazy var addressInfoView: AddressInfoView = {
        let view: AddressInfoView = .instantiateFromNib()
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    private lazy var surveyAppealView: SurveyAppealView = {
        let view: SurveyAppealView = .instantiateFromNib()
        view.configure(
            survey: HowWouldYouHaveMadeThisTripSurvey(),
            presenter: self
        )
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    private var currentRide: Ride? {
        return context.dataStore.fetchCurrentRide()
    }

    private var origin: Address?
    private var destination: Address?
    private var notificationFeedback = UINotificationFeedbackGenerator()
    private var ridePollingTimer: Timer?
    private var etaTimer: Timer?
        
    private func startRequestTimer(_ requestTimestamp: Date) {
        stopRequestTimer()
        pendingRequestTimestamp = requestTimestamp
        self.setSearchingStates()
        pendingRequestTimer = Timer.scheduledTimer(withTimeInterval: 8.0, repeats: true, block: { _ in
            if self.pendingRequestTimestamp != nil {
                self.setSearchingStates()
            }
        })
    }
    
    //depending on the time passed since the pending request, show a different copy on the searching view
    private func setSearchingStates() {        
        if getTimeSinceRequest() > 120.0 /*2 minutes*/ {
            self.searchingView.configureSecondSearchStatus()
        } else {
            self.searchingView.configureFirstSearchStatus()
        }
    }
    
    private func getTimeSinceRequest() -> Double {
        return Date().timeIntervalSince(self.pendingRequestTimestamp ?? Date())
    }
    
    private func stopRequestTimer() {
        pendingRequestTimer?.invalidate()
        pendingRequestTimer = nil
        pendingRequestTimestamp = nil
    }

    override func viewDidLoad() {
        rightNavigationStyle = .custom(#imageLiteral(resourceName: "round_edit_location_black_24pt"))
        rightNavigationAction = .custom({
           let vc = LocationsViewController()
           vc.isEditingLocation = true
           self.present(vc, animated: true)
        })

        super.viewDidLoad()
        placesClient = GMSPlacesClient.shared()
        autocompleteSessionToken = GMSAutocompleteSessionToken.init()

        context.socket.delegate = self

        topView.verticalStackView.spacing = 10
        topView.verticalStackView.addArrangedSubview(addressFieldsView)
        addressFieldsView.pinHorizontalEdges(to: topView.verticalStackView, constant: 20)

        topView.verticalStackView.addArrangedSubview(searchTableView)
        searchTableView.pinHorizontalEdges(to: topView.verticalStackView, constant: 20)
        
        topView.verticalStackView.addArrangedSubview(addressInfoView)
        addressInfoView.pinHorizontalEdges(to: topView.verticalStackView, constant: 20)
        addressInfoView.isHidden = true

        topView.rightNavigationButton.accessibilityIdentifier = "locationsNavigationButton"
        topView.titleLabel.accessibilityIdentifier = "homeTitleLabel"
        
        shouldShowLocationAlert = true
        shouldCheckLatestRide = true

        updateUserLocale()
        fetchCurrentUserDetails()
        
        stackView.distribution = .equalSpacing
                
        Notification.addObserver(self, name: .didUpdateCurrentLocation, selector: #selector(resetRequest))
        Notification.addObserver(self, name: .didLogout, selector: #selector(onLogout))
        Notification.addObserver(self, name: .didVerifyEmail, selector: #selector(refreshUserDetails))
    }

    @objc override func onAppResume() {
        if let lastLocationServicesEnabled, lastLocationServicesEnabled == false &&
            lastLocationServicesEnabled != CLLocationManager.locationServicesEnabled() &&
            CLLocationManager.authorizationStatus() == .notDetermined {
            // If location services were initially off when the app started and are now turned back on,
            // the app should request permission to access location when needed.
            CLLocationManager().requestWhenInUseAuthorization()
        }

        super.onAppResume()

        updateOrFetchCurrentRide()
        
        if context.dataStore.fetchCurrentRide() == nil && !self.requestIsPending {
            updateCurrentLocation()
        }
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        
        validateRoute()
        updateOrFetchCurrentRide()
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        bottomView.isHidden = false
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        ProgressHUD.dismiss()
    }

    override func removeBottomArrangedSubviews() {
        super.removeBottomArrangedSubviews()
        self.stopRequestTimer()
        self.delayedTask.cancel()
        etaTimer?.invalidate()
        etaTimer = nil
        removeBottomViews()
    }

    override func didUpdateCurrentLocation() {
        super.didUpdateCurrentLocation()
        shouldShowLocationAlert = true
        currentLocationFetched = true
        checkLoadingStatus()
        if self.currentRide == nil {
            showRequestRide(shouldResetRequest: false)
        }
    }
    
    override func onAppReconnect() {
        validateRoute()
        updateOrFetchCurrentRide()
    }

    override func showConnectivityView() {
        if !connectivityView.isDescendant(of: topView.verticalStackView) {
            topView.verticalStackView.addArrangedSubview(connectivityView)
            connectivityView.pinHorizontalEdges(to: topView.verticalStackView, constant: 0)
            GAManager.trackEvent(GAEvents.RIDER_SOCKET_DISCONNECTED)
        }
    }

    override func fetchCurrentLocationDetails(locationId: String) {
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

    func fetchCurrentLocationAds() {
        guard let currentLocationId = context.currentLocation?.id else {
            return
        }
        let query = MediaQuery(location: currentLocationId)
        context.api.getMedia(query) { result in
            switch result {
            case .success(let response):
                self.rideViewModel?.updateLocationMedia(response.mediaList)
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }

    override func fetchCurrentUserDetails() {
        context.api.getUser() { result in
            switch result {
            case .success(let response):
                self.context.currentUser.update(with: response)
                if self.context.dataStore.fetchCurrentRide() == nil {
                    self.showRequestRide(shouldResetRequest: false)
                }
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
        
        context.api.getGlobalSettings() { result in
            switch result {
            case .success(let response):
                Defaults.skipPhoneVerification = response.skipPhoneVerification
                Defaults.isDynamicRideSearch = response.isDynamicRideSearch
                Defaults.flux = response.flux
                Defaults.hideTripAlternativeSurvey = response.hideTripAlternativeSurvey
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }
    
    override func updateCurrentLocation() {
        if context.currentLocation == nil {
            if !checkIfLocationPermissionIsEnabled() {
                return
            }
        }

        fetchNearestLocationBasedOnGPSCoordinates { locationResponse in
            if let location = locationResponse {
                self.updateCurrentLocation(with: location)
            }
        }
    }

    private func checkIfLocationPermissionIsEnabled() -> Bool {
        if CLLocationManager.locationServicesEnabledAndAppPermissionAuthorized() {
            return true
        }
        else {
            presentAlert("settings_enable_location_permissions".localize(), message: "settings_enable_location_permissions_info".localize())
            return false
        }
    }
    
    private func selectCurrentLocation() {
        if !checkIfLocationPermissionIsEnabled() || currentRide != nil {
            return
        }
        
        if RouteStorage.shared.hasRoute {
            if let originLat = RouteStorage.shared.originLat,
               let originLon = RouteStorage.shared.originLon,
               let destLat = RouteStorage.shared.destinationLat,
               let destLon = RouteStorage.shared.destinationLon {

                getAddressFromCoordinate(latitude: originLat, longitude: originLon, isPickup: true)
                getAddressFromCoordinate(latitude: destLat, longitude: destLon, isPickup: false)
            }
        } else {
            guard let latitude = Defaults.userLatitude?.rounded(toPlaces: 8),
                let longitude = Defaults.userLongitude?.rounded(toPlaces: 8) else {
                    return
            }
            
            getAddressFromCoordinate(latitude: latitude, longitude: longitude, isPickup: true)
        }
    }
    
    private func getAddressFromCoordinate(latitude: Float, longitude: Float, isPickup: Bool) {
        
        guard let location = context.dataStore.currentLocation() else {
                return
        }
        
        let query = GetAddressesQuery(location: location.id, latitude: latitude, longitude: longitude)
        context.api.getAddresses(query) { result in
            switch result {
            case .success(let response):
                if self.currentRide != nil {
                    return
                }
                
                if let validAddress = response.first(where: { $0.isValid ?? true }) {
                    self.getStopValidation(address: validAddress.address, latitude: Float(validAddress.latitude), longitude: Float(validAddress.longitude), isPickup: isPickup)
                } else {
                   //TODO: handle the error here
                }

                if !(self.addressFieldsView.pickupAddressField.isFirstResponder || self.addressFieldsView.dropoffAddressField.isFirstResponder) {
                    self.searchTableView.isHidden = true
                }
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }
    
    private func checkLastRide() {
        context.api.getLastCompletedRide { result in
            switch result {
            case .success(let response):
                
                guard let lastRide = response.first else {
                    return
                }
                let ride = Ride(context: self.context.dataStore.mainContext)
                ride.update(with: lastRide)
                
                if !ride.isRated {
                    let confirm = UIAlertAction(title: "ride_review_btn".localize(), style: .default, handler: { _ in
                        if self.navigationController?.isControllerOnStack(ofClass: RatingViewController.self) == .some(false) {
                            let vc = RatingViewController()
                            vc.setRide(ride: ride)
                            self.navigationController?.pushViewController(vc, animated: true)
                        }
                    })
                    self.navigationController?.presentAlert("".localize(), message: "ride_review_body".localize(), cancel: nil, confirm: confirm)
                }
            case .failure(_):
                break
            }
        }
    }
    
    private func getStopValidation(address: String?, latitude: Float?, longitude: Float?, isPickup: Bool) {
        guard let lat = latitude, let lng = longitude, let location = context.dataStore.currentLocation() else {
            return
        }
        
        var selectedStop: String?
        if let dropoffFS = destination?.fixedStopId, isPickup {
            selectedStop = dropoffFS
        }
        if let pickupFS = origin?.fixedStopId, !isPickup {
            selectedStop = pickupFS
        }
        
        let query = StopTypeQuery(latitude: lat, longitude: lng, locationId: location.id, selectedStop: selectedStop)
        
        if isPickup {
            addressFieldsView.updatePickup("ride_fetching_stops".localize())
        } else {
            addressFieldsView.updateDropoff("ride_fetching_stops".localize())
        }

        context.api.getStopType(query) { result in
            switch result {
            case .success(let response):
                if response.isFixedStop ?? false, let stop = response.stop {
                    self.setFixedStopAddress(fixedStop: stop, isPickup: isPickup)
                } else {
                    self.setStreetAddress(address: address, latitude: lat, longitude: lng, isPickup: isPickup)
                }
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }
    
    private func updateUserLocale() {
        let request = UpdateLocaleRequest(locale: TranslationsManager.getCurrentLanguage())
        context.api.updateUserLocale(request) { result in
            switch result {
            case .success(let response):
                print(response)
            case .failure(let error):
                print(error.localizedDescription)
            }
        }
    }
    
    private func checkLoadingStatus() {
        if currentLocationFetched && currentRideFetched {
            ProgressHUD.dismiss()
            
            guard let location = context.dataStore.currentLocation() else {
                return
            }
            
            if shouldShowLocationAlert && location.showAlert && tabController?.selectedIndex == 0 {
                let alert = UIAlertController(title: location.alertTitle, message: location.alertCopy, preferredStyle: .alert)
                alert.addAction(UIAlertAction(title: "general_ok".localize(), style: .default))
                present(alert, animated: true, completion: {
                    self.shouldShowLocationAlert = false
                })
            }
            
            if let ride = context.dataStore.fetchCurrentRide() {
                if ride.isWaiting || ride.isDriverArrived {
                    self.showWaiting(ride: ride)
                } else if ride.isInProgress {
                    self.showInProgress()
                }
            } else {
                if shouldCheckLatestRide && tabController?.selectedIndex == 0 {
                    self.checkLastRide()
                }
            }
            shouldCheckLatestRide = false
            
        }
    }

    private func showRequestRide(shouldResetRequest: Bool? = true) {
        
        guard let location = context.dataStore.currentLocation() else {
            return
        }
        
        if self.requestIsPending {
            return
        }
        
        if let resetRequest = shouldResetRequest, resetRequest {
            origin = nil
            destination = nil
            addressFieldsView.updatePickup("")
            addressFieldsView.updateDropoff("")
            updateMarkers()
            selectCurrentLocation()
        }

        validateRoute()
        topView.rightNavigationButton.isHidden = false
        removeBottomArrangedSubviews()
        
        let currentUser = self.context.currentUser
        
        let notVerifiedInsideWindow = !currentUser.isEmailVerified && !currentUser.isPastEmailVerificationDeadline
        let notVerifiedOutsideWindow = !currentUser.isEmailVerified && currentUser.isPastEmailVerificationDeadline

        if location.canAcceptRequests {
            if notVerifiedOutsideWindow {
                addressFieldsView.isHidden = true
                ctaView.delegate = self
                if let email = context.dataStore.currentUser()?.email {
                    ctaView.configure(title: "email_deadline_warning_title".localize(), subtitle: "\("email_post_deadline_warning_body_1".localize()) \(email). \("email_post_deadline_warning_body_2".localize())", buttonText: "email_pre_deadline_warning_btn".localize())
                    bottomView.stackView.addArrangedSubview(ctaView)
                    ctaView.pinHorizontalEdges(to: bottomView, constant: 20)
                }
            } else {
                if notVerifiedInsideWindow {
                    ctaView.delegate = self
                    var ctaCopy = ""
                    if let deadline = currentUser.emailVerificationDeadline {
                        let diff = Calendar.current.dateComponents([.day], from: Date(), to: deadline).day!
                        ctaCopy = "\("email_pre_deadline_warning_body_1".localize()) \(currentUser.email). \("email_pre_deadline_warning_body_2".localize()) \(diff) \("email_pre_deadline_warning_body_3".localize())\(diff > 1 ? "s" : "") \("email_pre_deadline_warning_body_4".localize())"
                    }
                    ctaView.configure(title:"email_deadline_warning_title".localize(), subtitle: ctaCopy , buttonText:  "email_pre_deadline_warning_btn".localize())
                    bottomView.stackView.addArrangedSubview(ctaView)
                    ctaView.pinHorizontalEdges(to: bottomView, constant: 20)
                }
                addressFieldsView.isHidden = false
                checkFluxStatus()
            }
        } else {
            addressFieldsView.isHidden = true
            bottomView.stackView.addArrangedSubview(locationUnavailableView)
            locationUnavailableView.pinHorizontalEdges(to: bottomView, constant: 20)
            locationUnavailableView.configure(with: location)
        }
    }
    
    private func popRideHostingView() {
        if let hostingController = rideHostingController {
            if let navigationController = self.navigationController, navigationController.viewControllers.contains(hostingController) {
                navigationController.popViewController(animated: false)
                rideHostingController = nil
            }
        }
    }

    private func showSearching() {
        self.requestIsPending = true
        removeBottomArrangedSubviews()
        topView.rightNavigationButton.isHidden = true
        addBottomView(bottomView: searchingView)
        addressFieldsView.updateFields(for: .rideRequested)
        addressInfoView.isHidden = true
        mapView.markers.forEach { $0.isTappable = false }
        NotificationCoordinator.requestPermission()
        if Defaults.isDynamicRideSearch {
            startCurrentRidePolling()
        }
    }
    
    private func startCurrentRidePolling() {
        ridePollingTimer?.invalidate()
        ridePollingTimer = nil
        
        ridePollingTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true, block: { _ in
            self.context.api.getRideRequests { result in
                switch result {
                case .success(let response):
                    if response.first == nil {
                        self.requestIsPending = false
                        self.showRequestRide()
                        self.stopCurrentRidePolling()
                        self.requestCurrentRide()
                    }
                case .failure(let error):
                    print(error.localizedDescription)
                }
            }
        })
    }
    
    private func stopCurrentRidePolling() {
        ridePollingTimer?.invalidate()
        ridePollingTimer = nil
        context.socket.connect()
    }

    private func showWaiting(ride: Ride) {
        
        if rideViewModel == nil {
            rideViewModel = RideViewModel(ride: ride)
        } else {
            rideViewModel?.updateRide(ride)
        }
        
        rideViewModel?.updateLocation(context.currentLocation)
        
        if !Defaults.hideTripAlternativeSurvey {
            let survey = HowWouldYouHaveMadeThisTripSurvey()
            rideViewModel?.updateSurvey(survey.shouldAskForSurvey() ? survey : nil)
        }
        
        if rideHostingController == nil {
            let rideView = RideSUIView(
                rideViewModel: rideViewModel!,
                hostingController: self,
                delegate: self
            )
            let controller = UIHostingController(rootView: rideView)
            self.rideHostingController = controller
            self.navigationController?.pushViewController(controller, animated: false)
            fetchCurrentLocationAds()
        }

        etaTimer?.invalidate()
        etaTimer = nil

        etaTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true, block: { _ in
            self.updateETA()
        })

        updateETA()
    }
    
    private func updateWaitingView(eta: Int, isPooling: Bool, stops: Int) {
        if let hostingController = rideHostingController {
            rideViewModel?.updateETA(eta)
            rideViewModel?.updateIsPooling(isPooling)
            rideViewModel?.updateStops(stops)
        }
    }

    private func removeSurveyPanel() {
        surveyAppealView.removeFromSuperview()
    }

    private func updateETA() {
        guard let currentRide = self.currentRide, currentRide.isWaiting || currentRide.status == .driverArrived else {
            return
        }

        Logger.rideRequest.debug("Updating ETA")
        let request = RideStatusRequest(ride: currentRide.id)
        self.context.api.getRideStatus(request, completion: { result in
            switch result {
            case .success(let response):
                let isPooling = response.pooling ?? false
                let stops = response.stops ?? 0
                if let eta = response.eta {
                    self.updateWaitingView(eta: Int(eta), isPooling: isPooling, stops: stops)
                }
            case .failure(let error):
                print(error.localizedDescription)
            }
        })
    }

    private func showInProgress() {
        if let ride = self.currentRide {
            showWaiting(ride: ride)
        }
    }

    private func validateRoute() {
        if let origin = origin,
            let destination = destination,
            origin.isValid ?? false,
            destination.isValid ?? false {
            addBottomView(bottomView: routeBottomView)
            
            if let origin = origin.addressShort, let destination = destination.addressShort {
                let route = "\("ride_from".localize()) \(origin) \("ride_to".localize()) \(destination)."
                routeBottomView.configure(with: route)
            }
            
        } else {
            if routeBottomView.isDescendant(of: view) {
                routeBottomView.removeFromSuperview()
            }
        }
    }

    private func addBottomView(bottomView: CardView) {
        mainBottomStackView.addArrangedSubview(bottomView)
    }

    private func removeBottomViews() {
        if routeBottomView.isDescendant(of: view) {
            routeBottomView.removeFromSuperview()
        }
        if quoteBottomView.isDescendant(of: view) {
            quoteBottomView.removeFromSuperview()
        }
        if searchingView.isDescendant(of: view) {
            searchingView.removeFromSuperview()
        }
        
        if surveyAppealView.isDescendant(of: view) {
            removeSurveyPanel()
        }
    
        popRideHostingView()
    }

    private func updateMarkers(shouldHideDirections: Bool = true) {
        
        let oldMapSignature = mapView.getMarkersSignature()
        
        mapView.clearMarkers()
        if shouldHideDirections {
            mapView.clearPolylines()
        }
       
        var pickupMarker: Marker?
        var dropoffMarker: Marker?
        
        if let origin = origin {
            let coordinate = CLLocationCoordinate2D(latitude: origin.latitude, longitude: origin.longitude)
            pickupMarker = mapView.addMarker(position: coordinate, icon: #imageLiteral(resourceName: "pickupActive"), animated: true)
            pickupMarker?.isDraggable = false
            pickupMarker?.userData = "origin"
            
            if let pickupAddress = origin.addressShort {
                pickupMarker?.title = "\("ride_pickup_at".localize()) \(pickupAddress)\n"
            }
            
            if origin.fixedStopId != nil {
                pickupMarker?.snippet = "ride_driver_pickup_fs_simple".localize()
            } else {
                pickupMarker?.snippet = "ride_driver_pickup_simple".localize()
            }
            
            mapView.selectedMarker = pickupMarker
            
            if let currentPosLat = Defaults.userLatitude?.rounded(toPlaces: 8),
               let currentPosLon = Defaults.userLongitude?.rounded(toPlaces: 8), origin.fixedStopId != nil{
                let currentPosition = CLLocationCoordinate2D(latitude: currentPosLat, longitude: currentPosLon)
                let pickupPosition = CLLocationCoordinate2D(latitude: origin.latitude, longitude: origin.longitude)
                if shouldGetPickupDirections(location: context.currentLocation, position: currentPosition) {
                    let line = Polyline(origin: currentPosition, destination: pickupPosition, transportation: .walking)
                    self.mapView.fetchAndDraw(polyline: line)
                }
            }
        }

        if let destination = destination {
            let coordinate = CLLocationCoordinate2D(latitude: destination.latitude, longitude: destination.longitude)
            dropoffMarker = mapView.addMarker(position: coordinate, icon: #imageLiteral(resourceName: "dropoffActive"), animated: true)
            dropoffMarker?.isDraggable = false
            dropoffMarker?.userData = "destination"
            
            if let dropoffAddress = destination.addressShort {
                dropoffMarker?.title = "\("ride_dropoff_at".localize()) \(dropoffAddress)\n"
            }
            
            if destination.fixedStopId != nil {
                dropoffMarker?.snippet = "ride_driver_dropoff_fs_simple".localize()
            } else {
                dropoffMarker?.snippet = "ride_driver_dropoff_simple".localize()
            }
            
            mapView.selectedMarker = dropoffMarker
        }
        
        if mapView.getMarkersSignature() != oldMapSignature {
            fitMarkers(includePickup: true, includeDropoff: true, includeCurrentPosition: true)
        }
    }
    
    private func shouldGetPickupDirections(location: Location?, position: CLLocationCoordinate2D) -> Bool {
        //check if position is on current location
        guard let location = location, location.riderPickupDirections else {
            return false
        }
    
        //check if polyline exists and if it does, if a new one is needed
        return mapView.polylines.isEmpty
    }
    
    private func fitMarkers(includePickup: Bool, includeDropoff: Bool, includeCurrentPosition: Bool) {
        
        if mapView.markers.isEmpty {
            return
        }
        
        var positionsToFit: [CLLocationCoordinate2D] = []
        
        if includePickup {
            if let pickupMarker = mapView.markers.first(where: { $0.userData as? String == "origin" }) {
                positionsToFit.append(pickupMarker.position)
            }
        }
        if includeDropoff {
            if let dropoffMarker = mapView.markers.first(where: { $0.userData as? String == "destination" }) {
                positionsToFit.append(dropoffMarker.position)
            }
        }
        if let latitude = Defaults.userLatitude?.rounded(toPlaces: 8),
           let longitude = Defaults.userLongitude?.rounded(toPlaces: 8), includeCurrentPosition {
            positionsToFit.append(CLLocationCoordinate2D(latitude: latitude, longitude: longitude))
        }
        
        if let driverMarker = mapView.markers.first(where: { $0.userData as? String == "driver" }) {
            positionsToFit.append(driverMarker.position)
        }
        
        var bounds = GMSCoordinateBounds()
        positionsToFit.forEach { bounds = bounds.includingCoordinate($0) }
                
        if mainBottomStackView.bounds.height == 0 {
            mapView.updateCamera(to: bounds, insets: UIEdgeInsets(top: 400, left: 100, bottom: 300 , right: 100), animated: true)
        } else {
            let verticalOffset = view.bounds.height - mainBottomStackView.bounds.height
            mapView.updateCamera(to: bounds, insets: UIEdgeInsets(top: 100, left: 100, bottom: verticalOffset , right: 100), animated: true)
        }
    }
    
    private func getPlacesResults(text: String, isPickup: Bool) {
        guard let location = context.currentLocation,
            location.serviceAreaBounds.isValid else {
                return
        }
        
        let filter = GMSAutocompleteFilter()
        let bounds = location.serviceAreaBounds
        
        filter.locationRestriction = GMSPlaceRectangularLocationOption(bounds.northEast, bounds.southWest);

        placesClient?.findAutocompletePredictions(
            fromQuery: text,
            filter: filter,
            sessionToken: autocompleteSessionToken,
            callback: { (results, error) in
                if let error {
                    self.presentAlert("Fetching addresses".localize() + " " + "failed".localize(), message: error.localizedDescription + " (Google Places)")
                } else if let results {
                    if isPickup {
                        self.updatePickupRequestWithPlaces(results: results)
                    } else {
                        self.updateDropoffRequestWithPlaces(results: results)
                    }
                }
            }
        )
    }
    
    private func updatePickupRequestWithPlaces(results: [GMSAutocompletePrediction]) {
        self.searchTableView.configure(results: results, isPickup: true)
        
        if self.addressFieldsView.pickupAddressField.isFirstResponder {
            self.searchTableView.isHidden = false
        }
    }
    
    private func updateDropoffRequestWithPlaces(results: [GMSAutocompletePrediction]) {
        self.searchTableView.configure(results: results, isPickup: false)

        if self.addressFieldsView.dropoffAddressField.isFirstResponder {
            self.searchTableView.isHidden = false
        }
    }

    private func updatePickup(to response: Address?) {

        RouteStorage.shared.clearRoute()
        origin = response

        if let origin = origin {
            addressFieldsView.updatePickup(origin)
        }

        validateRoute()
        updateMarkers()
    }

    private func updateDropoff(to response: Address?) {

        RouteStorage.shared.clearRoute()
        destination = response

        if let destination = destination {
            addressFieldsView.updateDropoff(destination)
        }

        validateRoute()
        updateMarkers()
    }
    
    private func setFixedStopAddress(fixedStop: StopTypeResponse.Stop, isPickup: Bool) {

        guard let fsName = fixedStop.name, let fsId = fixedStop.id else {
            return
        }

        setStreetAddress(
            address: fsName,
            latitude: fixedStop.latitude,
            longitude: fixedStop.longitude,
            fixedStopId: fsId,
            isPickup: isPickup
        )
    }

    private func setStreetAddress(address: String?, latitude: Float, longitude: Float, fixedStopId: String? = nil, isPickup: Bool) {
        let selectedAddress = Address(
            address: address ?? "",
            latitude: latitude,
            longitude: longitude,
            fixedStopId: fixedStopId,
            isFixedStop: fixedStopId != nil
        )

        if isPickup {
            updatePickup(to: selectedAddress)
        } else {
            updateDropoff(to: selectedAddress)
        }
    }

    @objc private func onLogout() {
        Notification.removeObserver(self, name: .applicationWillEnterForeground)
    }
    
    @objc private func refreshUserDetails() {
        fetchCurrentUserDetails()
    }

    @objc private func resetRequest() {
        validateRoute()
        updateMarkers(shouldHideDirections: true)
        addressFieldsView.updatePickup("")
        addressFieldsView.updateDropoff("")
        topView.rightNavigationButton.isHidden = false
        updateOrFetchCurrentRide()
        if let location = context.currentLocation, !isRefreshingLocation {
            fetchCurrentLocationDetails(locationId: location.id)
        }
    }

    @objc private func updateOrFetchCurrentRide() {
        currentRideFetched = false
        if context.dataStore.fetchCurrentRide() == nil {
            fetchCurrentRideIfAvailable()
        } else {
            updateCurrentRide()
        }
    }

    @objc private func updateCurrentRide() {
        guard let ride = context.dataStore.fetchCurrentRide() else {
            showRequestRide()
            updateMarkers()
            return
        }

        if !isSocketDisconnected {
            ProgressHUD.show()
        }

        let query = RideQuery(id: ride.id)
        context.api.getRide(query) { result in
            ProgressHUD.dismiss()

            let previousIsCancelled = ride.isCancelled

            switch result {
            case .success(let response):
                ride.update(with: response)
                self.context.dataStore.save()
            default:
                break
            }

            self.addressFieldsView.updateFields(for: ride.status)
            self.addressFieldsView.updatePickupAndDropoff(for: ride)

            if ride.isWaiting || ride.isDriverArrived {
                self.showWaiting(ride: ride)
            } else if ride.isInProgress {
                self.showInProgress()
            } else if ride.isComplete {
                self.showRequestRide()
            } else if ride.isCancelled {
                self.showRequestRide()
                if self.isShowing, !previousIsCancelled {
                    self.presentAlert("ride_cancelled".localize(), message: "ride_cancelled_info".localize())
                }
            }
            self.updateMarkers()
            self.currentRideFetched = true
            self.checkLoadingStatus()
        }
    }
    
    private func checkFluxStatus() {
        guard let location = context.dataStore.currentLocation() else {
            return
        }
        
        if !Defaults.flux {
            //do not fetch flux and hide the UI indication
            addressFieldsView.hideFlux()
        }
                
        context.api.getFlux(locationId: location.id) { result in
            switch result {
            case .success(let response):
                self.addressFieldsView.configureFlux(fluxResponse: response)
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }

    @objc private func fetchCurrentRideIfAvailable() {
        
        guard context.dataStore.fetchCurrentRide() == nil else {
            return
        }

        if !isSocketDisconnected {
            ProgressHUD.show()
        }
        
        context.api.getRideRequests { result in
            switch result {
            case .success(let response):
                ProgressHUD.dismiss()
                
                guard let pendingRequest = response.first else {
                    self.requestIsPending = false
                    self.showRequestRide()
                    self.addressFieldsView.updateFields(for: .cancelledRequest)
                    
                    self.requestCurrentRide()
                    return
                }
                
                self.updatePickup(to: pendingRequest.origin)
                self.updateDropoff(to: pendingRequest.destination)
                self.addressFieldsView.updateFields(for: .rideRequested)
                                
                if pendingRequest.waitingPaymentConfirmation ?? false {
                    self.requestIsPending = true
                    self.showQuoteConfirmation(pendingRequest.paymentInformation)
                } else {
                    self.showSearching()
                    self.startRequestTimer(pendingRequest.requestTimestamp.utcStringToDate())
                }

            case .failure(let error):
                ProgressHUD.dismiss()
                print(error.localizedDescription)
                self.requestCurrentRide()
            }
        }
    }
    
    @objc private func requestCurrentRide() {
        context.api.getCurrentRide { result in
            self.context.dataStore.wipeRides()
            switch result {
            case .success(let response):
                let ride = Ride(context: self.context.dataStore.mainContext)
                ride.update(with: response)
                self.context.dataStore.save()
                self.updatePickup(to: response.origin)
                self.updateDropoff(to: response.destination)
                self.addressFieldsView.updateFields(for: ride.status)                
                if ride.isWaiting || ride.isDriverArrived {
                    self.showWaiting(ride: ride)
                } else if ride.isInProgress {
                    self.showInProgress()
                } else {
                    self.showRequestRide()
                }
                self.updateMarkers()
            default:
                break
            }
            self.currentRideFetched = true
            self.checkLoadingStatus()
        }
    }
    
    @objc func centerPinTapAction(sender : UITapGestureRecognizer) {
        self.stopEditPinMode()
    }
    
    //triggered when the user taps on an existing pickup/dropoff pin
    private func startEditPinMode(_ marker: Marker) {
        markerBeingMoved = marker.userData as? String
        mapView.updateCamera(position: marker.position, zoom: 15.0, animated: false)
        marker.removeFromMap()
        let isPickup = marker.userData as? String == "origin"
        centerMarkerView.configure(isPickup)
        stackView.addSubview(centerMarkerView)
        centerMarkerView.setConstraints([.centerX, .centerY], toView: view)
        addressInfoView.isHidden = false
        addressInfoView.configure(isEditing: true, hasMarkers: true)
        searchTableView.isHidden = true
    }
    
    //triggered when the user taps on the static pin image
    private func stopEditPinMode() {
        let coordinate = mapView.projection.coordinate(for: mapView.center)
        switch markerBeingMoved {
        case "origin":
            getAddressFromCoordinate(latitude: Float(coordinate.latitude), longitude: Float(coordinate.longitude), isPickup: true)
        case "destination":
            getAddressFromCoordinate(latitude: Float(coordinate.latitude), longitude: Float(coordinate.longitude), isPickup: false)
        default:
            break
        }
        centerMarkerView.removeFromSuperview()
        markerBeingMoved = nil
        addressInfoView.isHidden = true
    }
    
    func showQuoteConfirmation(_ paymentInformation: PaymentInformation?) {
        
        guard let paymentInformation = paymentInformation else {
            return
        }
                
        removeBottomArrangedSubviews()
        addBottomView(bottomView: quoteBottomView)
        quoteBottomView.configure(with: paymentInformation)
    }
 
    func handlePaymentFailure(message: String) {
        MixpanelManager.trackEvent(
            MixpanelEvents.RIDER_PAYMENT_FAILED,
            properties: [
                "error" : message
            ]
        )
        self.context.api.cancelRequestRide(completion: { result in
            switch result {
            case .success(_):
                self.requestIsPending = false
                self.showRequestRide()
                self.addressFieldsView.updateFields(for: .cancelledRequest)
            case .failure(let error):
                self.presentAlert(for: error)
            }
        })
        let confirm = UIAlertAction(title: "payments_add_pm".localize(), style: .default) { _ in
            let vc = CreditCardViewController()
            self.present(vc, animated: true)
        }
        presentAlert("payments_payment_error".localize(), message: "payments_payment_error_info".localize(), cancel: "general_cancel".localize(), confirm: confirm)
    }
}

extension RiderHomeViewController: RideRequestViewDelegate {

    func requestRide(request: Request) {
        requestRide(request: request, paymentValue: 0)
    }
    
    func requestRide(request: Request, paymentValue: Int) {
        guard let location = context.currentLocation else {
            presentAlert("locations_loc_invalid".localize(), message: "locations_loc_invalid_info".localize())
            return
        }

        guard let origin = request.origin, let destination = request.destination else {
            presentAlert("ride_address_missing".localize(), message: "ride_address_missing_info".localize())
            return
        }
            
        mapView.selectedMarker = nil
        
        ProgressHUD.show()
        
        let req = RequestRideRequest(location: location.id, passengers: request.passengers, isADA: location.isADA ? Defaults.requestingWheelchairAccess : false, origin: origin, destination: destination, message: nil, pwywValue: paymentValue, skipPaymentIntentCreation: true)

        self.context.api.requestRide(req) { result in
            switch result {
            case .success(let response):
                ProgressHUD.dismiss()
                MixpanelManager.trackEvent(
                    MixpanelEvents.RIDER_RIDE_REQUESTED,
                    properties: [
                        "origin" : response.origin.address,
                        "destination" : response.destination.address,
                        "isADA" : response.isADA,
                        "passengers" : response.passengers
                    ]
                )

                guard let waitingPaymentConfirmation = response.waitingPaymentConfirmation else {
                    self.showSearching()
                    self.startRequestTimer(Date())
                    return
                }

                if response.paymentInformation == nil || !waitingPaymentConfirmation {
                    self.showSearching()
                    self.startRequestTimer(Date())
                } else {
                    self.requestIsPending = true
                    self.addressFieldsView.updateFields(for: .rideRequested)
                    self.showQuoteConfirmation(response.paymentInformation)
                }

                if let fluxInfo = self.addressFieldsView.getCurrentFluxStatus() {
                    if fluxInfo.display {
                        GAManager.trackEvent(GAEvents.RIDER_SERVICE_INDICATOR_RECEIVED, properties: [
                            "flux_status" : fluxInfo.status,
                            "flux_message" : fluxInfo.message
                        ])
                    }
                }

            case .failure(let error):
                ProgressHUD.dismiss()
                // TODO: match with translated error from server
                if error.localizedDescription.contains("Please try again") || error.localizedDescription.contains("Please try requesting again") {
                    self.presentAlert("ride_too_soon".localize(), message: error.localizedDescription)
                } else {
                    self.presentAlert(for: error)
                }
                self.showRequestRide()
            }
        }
    }

}

extension RiderHomeViewController: SearchingBottomViewDelegate {

    func cancelRequest() {
        let confirm = UIAlertAction(title: "ride_yes_cancel".localize(), style: .destructive) { _ in
            self.context.api.cancelRequestRide(completion: { result in
                switch result {
                case .success(_):
                    self.requestIsPending = false
                    self.showRequestRide()
                    self.addressFieldsView.updateFields(for: .cancelledRequest)
                    MixpanelManager.trackEvent(
                        MixpanelEvents.RIDER_RIDE_CANCELED_BEFORE_ACCEPTANCE,
                        properties: [
                            "secondsSinceRequest" : self.getTimeSinceRequest(),
                        ]
                    )
                case .failure(let error):
                    self.presentAlert(for: error)
                }
            })
        }

        presentAlert("general_are_you_sure".localize(), message: "ride_cancel_request_info".localize(), cancel: "ride_Ill_wait".localize(), confirm: confirm)
    }
}

extension RiderHomeViewController: RouteBottomViewDelegate {
    func confirmRoute() {
        guard let origin = origin, let destination = destination, let location = context.dataStore.currentLocation() else {
            return
        }
        
        RouteStorage.shared.clearRoute()
        
        let query = LocationPaymentInfoQuery(
            originLatitude: origin.latitude,
            originLongitude: origin.longitude,
            destinationLatitude: destination.latitude,
            destinationLongitude: destination.longitude
        )
        ProgressHUD.show()
        context.api.getPaymentInformation(locationId: location.id, query: query) { result in
            ProgressHUD.dismiss()
            switch result {
            case .success(let response):
                let vc = RideRequestViewController()
                vc.setBaseRequest(pickup: origin, dropoff: destination, locationPaymentInfoResponse: response)
                vc.delegate = self
                self.present(vc, animated: true)
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }
}

extension RiderHomeViewController: QuoteBottomViewDelegate {
    func cancelQuote() {
        self.context.api.cancelRequestRide(completion: { result in
            switch result {
            case .success(_):
                self.requestIsPending = false
                self.showRequestRide()
                self.addressFieldsView.updateFields(for: .cancelledRequest)
                MixpanelManager.trackEvent(MixpanelEvents.RIDER_RIDE_QUOTE_CANCELED)
            case .failure(let error):
                self.presentAlert(for: error)
            }
        })
    }
    
    func confirmQuote(paymentInformation: PaymentInformation?) {
        
        guard let paymentInformation = paymentInformation else {
            return
        }
        
        if paymentInformation.clientSecret != nil {
            confirmPayment(clientSecret: paymentInformation.clientSecret!)
            return
        }
                
        ProgressHUD.show()
        self.context.api.validateRequestRide() { result in
            
            switch result {
            case .success(let response):
                guard let paymentInformation = response.paymentInformation else {
                    return
                }
                guard let clientSecret = paymentInformation.clientSecret else {
                    return
                }
                self.confirmPayment(clientSecret: clientSecret)
                
            case .failure(let error):
                ProgressHUD.dismiss()
                self.presentAlert(for: error)
            }
        }
    }
    
    func confirmRequest(paymentIntent: STPPaymentIntent) {
    
        let req = ConfirmRequestRideRequest(paymentIntentStatus: paymentIntent.status.rawValue, paymentIntentId: paymentIntent.stripeId)
        
        ProgressHUD.show()
        self.context.api.confirmRequestRide(req) { result in
            ProgressHUD.dismiss()
            switch result {
            case .success(_):
                
                self.showSearching()
                self.startRequestTimer(Date())
                MixpanelManager.trackEvent(
                    MixpanelEvents.RIDER_RIDE_QUOTE_CONFIRMED,
                    properties: [
                        "ride_price": paymentIntent.amount
                    ]
                )
                MixpanelManager.incrementUserPaymentValue(value: paymentIntent.amount)
            case .failure(let error):
                self.presentAlert(for: error)
                print(error)
                
            }
        }
    }
    
    func confirmPaymentIntent(clientSecret: String) {
        let paymentIntentParams = STPPaymentIntentParams(clientSecret: clientSecret)
        let paymentHandler = STPPaymentHandler.shared()
        ProgressHUD.show()

        paymentHandler.confirmPayment(paymentIntentParams, with: self) { (status, paymentIntent, error) in
            
            switch (status) {
            case .failed:
                ProgressHUD.dismiss()
                self.handlePaymentFailure(message: error?.localizedDescription ?? "")
                break
            case .canceled:
                ProgressHUD.dismiss()
                self.handlePaymentFailure(message: error?.localizedDescription ?? "")
                break
            case .succeeded:
                guard let paymentIntent = paymentIntent else {
                    return
                }
                self.confirmRequest(paymentIntent: paymentIntent)
                break
            @unknown default:
                ProgressHUD.dismiss()
                fatalError()
                break
            }
        }
    }
    
    func confirmPayment(clientSecret: String) {
        
        ProgressHUD.show()
        STPAPIClient.shared.retrievePaymentIntent(withClientSecret: clientSecret) { (paymentIntent, error) in
            
            guard let paymentIntent = paymentIntent else {
                ProgressHUD.dismiss()
                self.cancelQuote()
                return
            }
            
            if paymentIntent.status == .requiresCapture {
                self.confirmRequest(paymentIntent: paymentIntent)
            } else if paymentIntent.status == .requiresConfirmation {
                self.confirmPaymentIntent(clientSecret: clientSecret)
            }
        }
        
    }
    
    func showQuoteInfo() {
        let vc = LegalViewController()
        vc.type = .quoteInfo
        self.present(vc, animated: true)
    }
}

extension RiderHomeViewController: RideSUIDelegate {

    func didSelectManageRide() {
        let alert = UIAlertController(title: "", message: "Manage Ride".localize(), preferredStyle: .actionSheet)
        alert.addAction(UIAlertAction(title: "ride_contact_driver".localize(), style: .default, handler: { (UIAlertAction) in
            self.didSelectContact()
        }))
        alert.addAction(UIAlertAction(title: "ride_cancel_ride".localize(), style: .destructive, handler: { (UIAlertAction) in
            self.didSelectCancel()
        }))
        alert.addAction(UIAlertAction(title: "Dismiss".localize(), style: .cancel, handler: nil))

        // Configure for iPad
        if UIDevice.current.userInterfaceIdiom == .pad, let popoverController = alert.popoverPresentationController {
            popoverController.sourceView = self.view
            let sourceRect = CGRect(x: self.view.bounds.midX, y: self.view.bounds.midY, width: 0, height: 0)
            popoverController.sourceRect = sourceRect
            popoverController.permittedArrowDirections = [] //centered
        }

        self.present(alert, animated: true, completion: nil)
    }

}

extension RiderHomeViewController: WaitingRideBottomViewDelegate {

    func didSelectCancel() {
        let confirm = UIAlertAction(title: "ride_yes_cancel".localize(), style: .destructive) { _ in
            guard let ride = self.currentRide else {
                return
            }

            let emitter = RideCancelEmitter(ride: ride.id)
            self.context.socket.emit(emitter)
        
            let vc = OptionsViewController()
            vc.configure(
                with: "ride_cancel_reason".localize(),
                tracker: .mixpanel,
                trackerEventKey: MixpanelEvents.RIDER_RIDE_CANCELED_REASON,
                rideId: ride.id,
                options: rideCancelOptions
            )
            self.present(vc, animated: true)
            
            MixpanelManager.trackEvent(
                MixpanelEvents.RIDER_RIDE_CANCELED_AFTER_ACCEPTANCE,
                properties: [
                    "ride_id" : ride.id
                ]
            )
            
        }

        presentAlert("ride_driver_on_the_way".localize(), message: "ride_driver_on_the_way_info".localize(), cancel: "general_no".localize(), confirm: confirm)
    }

    func didSelectContact() {
        guard let ride = self.currentRide else {
            return
        }

        let vc = MessengerViewController()
        vc.ride = ride
        messengerNavigationController = NavigationController(rootViewController: vc)
        present(messengerNavigationController!, animated: true)
    }
}

extension RiderHomeViewController: AddressFieldsViewDelegate {
    
    
    func didClearPickup() {
        searchTableView.dataSource.refresh(results: nil, isPickup: true)
        searchTableView.tableView.reloadData()
        updatePickup(to: nil)

    }

    func didClearDropoff() {
        searchTableView.dataSource.refresh(results: nil, isPickup: false)
        searchTableView.tableView.reloadData()
        updateDropoff(to: nil)
    }

    func didBeginEditting() {
        let isPickup = addressFieldsView.pickupAddressField.isFirstResponder
        searchTableView.dataSource.isPickup = isPickup
        if isPickup {
            searchTableView.isHidden = false
        }
    }
    
    func didEditPickupPin(editing: Bool) {
        if editing {
            stopEditPinMode()
        } else {
            for marker in mapView.markers {
                if marker.userData as! String == "origin" {
                    startEditPinMode(marker)
                    return
                }
            }
        }
    }
     
    func didEditDropoffPin(editing: Bool) {
        if editing {
            stopEditPinMode()
        } else {
            for marker in mapView.markers {
                if marker.userData as! String == "destination" {
                    startEditPinMode(marker)
                    return
                }
            }
        }
    }

    func didEndEditting() {
        if !addressFieldsView.pickupAddressField.isFirstResponder && !addressFieldsView.dropoffAddressField.isFirstResponder {
            searchTableView.isHidden = true
        }
    }

    func didChangeText(to text: String, isPickup: Bool, withDelay delay: TimeInterval) {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            searchTableView.dataSource.refresh(results: nil, isPickup: isPickup)
            searchTableView.tableView.reloadData()
            return
        }

        self.getPlacesResults(text: text, isPickup: isPickup)
    }
}

extension RiderHomeViewController: RiderSocketDelegate {

    func listenSocketConnected() {
        updateOrFetchCurrentRide()
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

    func listenRequestFailed(_ response: SocketErrorResponse) {
        Logger.webSockets.critical("Request failed with '\(String(describing: response))'")

        requestIsPending = false
        showRequestRide()
        addressFieldsView.updateFields(for: .cancelledRequest)
        updateMarkers()
        notificationFeedback.notificationOccurred(.error)
        NotificationCoordinator.playSound(.RideCancelled)

        // TODO: match with translated error from server
        if response.message.lowercased().contains("no drivers are available") {
            presentAlert("ride_no_drivers".localize(), message: "ride_no_drivers_info".localize())
            MixpanelManager.trackEvent(MixpanelEvents.RIDER_RIDE_MISSED)
        } else {
            presentAlert("ride_request_cancelled".localize(), message: response.message)
        }
        self.stopCurrentRidePolling()
    }

    func listenRequestCompleted(_ response: RequestCompleted) {
        let ride = context.dataStore.fetchRide(id: response.id) ?? Ride(context: context.dataStore.mainContext)
        ride.update(with: response)
        context.dataStore.save()

        Logger.rideRequest.debug("🚙 \(ride.isDriverArrived ? "Driver arrived" : "Driver connected to rider")")
        
        notificationFeedback.notificationOccurred(.success)
        NotificationCoordinator.playSound(.CarHonk)

        self.requestIsPending = false
        self.stopRequestTimer()
        
        MixpanelManager.trackEvent(
            MixpanelEvents.RIDER_RIDE_STARTED,
            properties: [
                "ride_id" : ride.id
            ]
        )
        
        showWaiting(ride: ride)
        
        self.stopCurrentRidePolling()
    }

    func listenRideUpdatesResponse(_ response: RideUpdatesResponse) {
        guard let ride = context.dataStore.fetchRide(id: response.ride) else {
            return
        }
        
        if messengerNavigationController != nil {
            messengerNavigationController?.dismiss(animated: true, completion: nil)
        }

        let previousIsCancelled = ride.isCancelled
        let previousStatus = ride.status

        ride.update(with: response)

        addressFieldsView.updateFields(for: ride.status)
        updateMarkers()

        if ride.isCancelled {
            Logger.rideRequest.debug("🚙 Ride has been cancelled")
            context.dataStore.mainContext.wipeRides()
            showRequestRide()
            notificationFeedback.notificationOccurred(.error)
            if !previousIsCancelled {
                NotificationCoordinator.playSound(.RideCancelled)
                self.presentAlert("ride_cancelled".localize(), message: "ride_cancelled_info".localize())
            }
        } else if ride.isInProgress {
            Logger.rideRequest.debug("🚙 Ride is in progress")
            showInProgress()
            MixpanelManager.trackEvent(
                MixpanelEvents.RIDER_DRIVER_PICKED_UP,
                properties: [
                    "ride_id" : ride.id
                ]
            )
        } else if ride.isComplete {
            Logger.rideRequest.debug("🚙 Ride has finished")
            showRequestRide() //needs to happen before the push of the conclusion vc
            if isShowing {
                if self.navigationController?.isControllerOnStack(ofClass: RatingViewController.self) == .some(false) {
                    let vc = RatingViewController()
                    vc.setRide(ride: ride)
                    navigationController?.pushViewController(vc, animated: true)
                }
            }
            notificationFeedback.notificationOccurred(.success)
            MixpanelManager.trackEvent(
                MixpanelEvents.RIDER_RIDE_COMPLETED,
                properties: [
                    "ride_id" : ride.id
                ]
            )
        }
        
        if ride.isWaiting || ride.isDriverArrived {
            rideViewModel?.updateRide(ride)
        }

        if ride.status == .driverEnRoute, previousStatus != .driverEnRoute {
            NotificationCoordinator.playSound(.CarHonk)
        } else if ride.status == .driverArrived, previousStatus != .driverArrived {
            self.delayedTask.cancel()
            NotificationCoordinator.playSound(.CarHonk)
            MixpanelManager.trackEvent(
                MixpanelEvents.RIDER_DRIVER_ARRIVED,
                properties: [
                    "ride_id":ride.id
                ]
            )
        }

        context.dataStore.save()

        updateETA()
    }

    func listenRideDriverMoved(_ response: RideDriverMoved) {
        guard response.ride == currentRide?.id else {
            return
        }
        rideViewModel?.updateDriverPosition(CLLocationCoordinate2D(latitude: response.latitude, longitude: response.longitude))
    }
}

extension RiderHomeViewController: SearchAddressTableViewDelegate {

    func didSelect(item: SearchAddressItem, isPickup: Bool) {
        if let result = item.result {
            let originalAddress: String

            if let secondaryAddressComponents = result.attributedSecondaryText?.string.components(separatedBy: ","),
                let secondaryAddress = secondaryAddressComponents.first, secondaryAddressComponents.count > 1 {
                originalAddress = result.attributedPrimaryText.string + ", " + secondaryAddress
            }
            else {
                originalAddress = result.attributedPrimaryText.string
            }
            
            let fields: GMSPlaceField = GMSPlaceField(rawValue: GMSPlaceField.name.rawValue |
                                                        GMSPlaceField.coordinate.rawValue | GMSPlaceField.addressComponents.rawValue)
            
            placesClient?.fetchPlace(fromPlaceID: result.placeID, placeFields: fields, sessionToken: autocompleteSessionToken, callback: {
                (place: GMSPlace?, error: Error?) in
                if let error = error {
                    self.presentAlert("Fetching addresses".localize() + " " + "failed".localize(), message: error.localizedDescription)
                    return
                }
                guard let place = place else {
                    self.presentAlert("Fetching addresses".localize() + " " + "failed".localize(), message: "ride_place_is_empty".localize())
                    return
                }
                
                //todo: replace with address validator. remove this validator, construct the address response and send that to the validator
                
                let address: String
                if let name = place.name,
                    let street_number = place.addressComponents?.first(where: { $0.types.contains("street_number") })?.shortName,
                    let street_route = place.addressComponents?.first(where: { $0.types.contains("route") })?.shortName {
                    let fetchedAddress = "\(name), \(street_route) \(street_number)"
                    address = fetchedAddress
                }
                else {
                    address = originalAddress
                }
                
                self.getStopValidation(address: address, latitude: Float(place.coordinate.latitude), longitude: Float(place.coordinate.longitude), isPickup: isPickup)
            })
        } else {
            selectCurrentLocation()
        }
                
        addressFieldsView.pickupAddressField.resignFirstResponder()
        addressFieldsView.dropoffAddressField.resignFirstResponder()
    }
}

extension RiderHomeViewController: CtAViewDelegate {
    
    func didTapOnCtA() {
        let vc = EmailVerifyViewController()
        navigationController?.pushViewController(vc, animated: true)
        MixpanelManager.trackEvent(MixpanelEvents.RIDER_EMAIL_VERIFICATION_STARTED)
    }
}

extension RiderHomeViewController: STPAuthenticationContext {
    func authenticationPresentingViewController() -> UIViewController {
        return self
    }
}
