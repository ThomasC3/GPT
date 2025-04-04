//
//  RIdeSUIView.swift
//  FreeRide
//

import SwiftUI
import MapKit
import GoogleMaps
import Nuke
import NukeUI
import NukeExtensions

protocol RideSUIDelegate: AnyObject {
    func didSelectManageRide()
}

struct HeightPreferenceKey: PreferenceKey {
    static var defaultValue: [String: CGFloat] = [:]
    
    static func reduce(value: inout [String: CGFloat], nextValue: () -> [String: CGFloat]) {
        value.merge(nextValue()) { $1 }
    }
}

class RideViewModel: ObservableObject {
    @Published var ride: Ride
    @Published var location: Location?
    @Published var eta: Int?
    @Published var stops: Int?
    @Published var isPooling: Bool = false
    @Published var driverPos: CLLocationCoordinate2D?
    @Published var survey: Survey?
    @Published var locationMedia: [MediaResponse.MediaItem]?
    
    init(ride: Ride) {
        self.ride = ride
    }
    
    func updateRide(_ ride: Ride) {
        self.ride = ride
    }
    
    func updateLocation(_ location: Location?) {
        self.location = location
    }
    
    func updateETA(_ eta: Int?) {
        self.eta = eta
    }
    
    func updateStops(_ stops: Int?) {
        self.stops = stops
    }
    
    func updateIsPooling(_ isPooling: Bool) {
        self.isPooling = isPooling
    }
    
    func updateDriverPosition(_ position: CLLocationCoordinate2D?) {
        self.driverPos = position
    }
    
    func updateSurvey(_ survey: Survey?) {
        self.survey = survey
    }
    
    func updateLocationMedia(_ media: [MediaResponse.MediaItem]?) {
        self.locationMedia = media
    }
}

struct RideSUIView: View {
    
    @State private var bottomSheetPosition: BottomSheetPosition = .top
    @State private var componentHeights: [String: CGFloat] = [:]
    @State private var surveyAnswered: Bool = false
    @State private var showWaitingTimeInfo = false
    
    @ObservedObject var rideViewModel: RideViewModel
    
    let hostingController: UIViewController
    var delegate: RideSUIDelegate

    enum BottomSheetPosition {
        case top, bottom
    }

    private func handleMenuToggle() {
        if let tabBarController = hostingController.tabBarController as? TabBarController {
            tabBarController.toggleMenu()
        }
    }
    
    var body: some View {
        ZStack {
            MapViewRepresentable(
                rideViewModel: rideViewModel,
                componentHeights: componentHeights
            )
            .ignoresSafeArea()
            
            VStack {
                SwiftUI.Button(action: handleMenuToggle) {
                    Image("round_menu_black_48pt")
                        .resizable()
                        .frame(width: 42, height: 42)
                        .foregroundColor(.black)
                }
                .padding(.top, 8)
                .padding(.leading, 16)
                .frame(maxWidth: .infinity, alignment: .leading)
                Spacer() 
            }

            // Sheet layer
            DraggableSheetView(position: $bottomSheetPosition, componentHeights: componentHeights) {
                VStack(spacing: 0) {
                    
                    VStack(spacing: 0) {
                        RideStatusView(
                            position: $bottomSheetPosition,
                            showWaitingTimeInfo: $showWaitingTimeInfo,
                            rideViewModel: rideViewModel
                        )
                            .background(GeometryReader { geometry in
                                Color.clear.preference(key: HeightPreferenceKey.self,
                                    value: ["rideStatus": geometry.size.height])
                            })
    
                        VStack(spacing: 0) {
                            DriverInfoView(
                                position: $bottomSheetPosition,
                                rideViewModel: rideViewModel,
                                delegate: delegate
                            )
                                .background(GeometryReader { geometry in
                                    Color.clear.preference(key: HeightPreferenceKey.self,
                                        value: ["driverInfo": geometry.size.height])
                                })
                            RouteInfoView(
                                rideViewModel: rideViewModel
                            )
                                .background(GeometryReader { geometry in
                                    Color.clear.preference(key: HeightPreferenceKey.self,
                                        value: ["routeInfo": geometry.size.height])
                                })
                            if let survey = rideViewModel.survey, survey.shouldAskForSurvey() && !surveyAnswered {
                                SurveyView(
                                    rideViewModel: rideViewModel,
                                    onSurveyAnswered: {
                                        surveyAnswered = true
                                    }
                                )
                                    .background(GeometryReader { geometry in
                                        Color.clear.preference(key: HeightPreferenceKey.self,
                                            value: ["survey": geometry.size.height])
                                    })
                            }
                        }
                        .frame(maxHeight: .infinity, alignment: .top)
                        .padding(.vertical, 0)
                        .background(Color.white)
                        .cornerRadius(16)
                        .shadow(color: Color.black.opacity(0.2), radius: 10, x: 0, y: -3)
                    }
                    Spacer()
                }
                .frame(maxWidth: .infinity, minHeight: UIScreen.main.bounds.height) // Add minHeight here
                .background(rideViewModel.ride.status == .driverArrived ? Color(Theme.Colors.kelp) : Color(Theme.Colors.fluxGreen))
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.2), radius: 10, x: 0, y: -3)
            }
            
            VStack {
                Spacer()

                if let mediaItems = rideViewModel.locationMedia, !mediaItems.isEmpty {
                    let context = RiderAppContext.shared
                    let userId = context.dataStore.currentUser()?.id ?? ""
                    let locationId = rideViewModel.location?.id ?? ""
                    let rideId = rideViewModel.ride.id

                    let ads: [Advertisement] = mediaItems.compactMap { mediaItem in
                        if let adImageUrl = URL(string: mediaItem.sourceUrl), let adRedirectUrl = URL(string: mediaItem.url) {
                            return Advertisement(
                                imageUrl: adImageUrl,
                                redirectUrl: adRedirectUrl,
                                campaignId: mediaItem.campaignId,
                                mediaId: mediaItem.id,
                                advertiserId: mediaItem.advertiserId,
                                featured: mediaItem.featured ?? false
                            )
                        }
                        else {
                            return nil
                        }
                    }

                    if !ads.isEmpty {
                        AdCarouselView(
                            ads: ads,
                            onAdClicked: { ad, adIndex, totalAds in
                                GAManager.trackEvent("advertisement_click", properties: [
                                    "locationId": locationId,
                                    "rideId": rideId,
                                    "campaignId": ad.campaignId,
                                    "mediaId": ad.mediaId,
                                    "userId": userId,
                                    "advertiserId": ad.advertiserId,
                                    "adIndex": adIndex,
                                    "adFeatured": ad.featured,
                                    "totalAds": totalAds,
                                ])
                            },
                            onAdViewed: { ad, adIndex, totalAds in
                                GAManager.trackEvent("advertisement_view", properties: [
                                    "locationId": locationId,
                                    "rideId": rideId,
                                    "campaignId": ad.campaignId,
                                    "mediaId": ad.mediaId,
                                    "userId": userId,
                                    "advertiserId": ad.advertiserId,
                                    "adIndex": adIndex,
                                    "adFeatured": ad.featured,
                                    "totalAds": totalAds,
                                ])
                            }
                        )
                        .background(GeometryReader { geometry in
                            Color.white.preference(key: HeightPreferenceKey.self,
                                value: ["adCarousel": geometry.size.height])
                        })
                    }
                }
            }
            .background(Color.clear)
            
        }
        .onPreferenceChange(HeightPreferenceKey.self) { heights in
            componentHeights = heights
            //print("Component heights: \(heights)") // This will print the heights
        }
        .fullScreenCover(isPresented: $showWaitingTimeInfo) {
            WaitingTimeInfoSUIView()
        }
    }
}

struct MapViewRepresentable: UIViewRepresentable {

    @ObservedObject var rideViewModel: RideViewModel
    let componentHeights: [String: CGFloat]
    
    func makeUIView(context: Context) -> MapView {
        let mapView = MapView()
        if let styleURL = Bundle.main.url(forResource: "map_style", withExtension: "json") {
            mapView.styleMapUsing(fileAt:styleURL) {_ in }
        }
        mapView.settings.myLocationButton = false
        mapView.backgroundColor = Theme.Colors.backgroundGray
        mapView.isMyLocationEnabled = true
        updateUIView(mapView, context: context)
        return mapView
    }
    
    func updateUIView(_ mapView: MapView, context: Context) {
        updateMarkers(mapView)
        
        let ride = rideViewModel.ride
        let statusHeight = componentHeights["rideStatus", default: 0]
        let driverHeight = componentHeights["driverInfo", default: 0]
        let routeHeight = componentHeights["routeInfo", default: 0]
        let adHeight = componentHeights["adCarousel", default: 0]
        let surveyHeight = componentHeights["survey", default: 0]
        
        let newOffset = statusHeight + driverHeight + routeHeight + adHeight + surveyHeight
        
        let newMapSignature = mapView.getMarkersSignature() + "-\(ride.statusValue)"

        if context.coordinator.mapStatusSignature != newMapSignature || context.coordinator.mapOffset != newOffset {
            context.coordinator.mapStatusSignature = newMapSignature
            if newOffset > context.coordinator.mapOffset {
                context.coordinator.mapOffset = newOffset
            }
            
            if ride.status == .driverArrived {
                let scrollUpDistance = context.coordinator.mapOffset * (0.0001/30)
                let originPosition = CLLocationCoordinate2D(latitude: ride.originLatitude - Float(scrollUpDistance), longitude: ride.originLongitude)
                mapView.updateCamera(position: originPosition, zoom: 17.0, animated: true)
            } else {
                var bounds = GMSCoordinateBounds()
                mapView.markers.forEach { bounds = bounds.includingCoordinate($0.position) }
                mapView.updateCamera(to: bounds, insets: UIEdgeInsets(top: 100, left: 100, bottom: 100 + context.coordinator.mapOffset , right: 100), animated: true)
            }
        }
    }
    
    func updateMarkers(_ mapView: MapView) {
        mapView.clearMap()
        
        let ride = rideViewModel.ride
        let originMarker = mapView.addMarker(position: CLLocationCoordinate2D(latitude: ride.originLatitude, longitude: ride.originLongitude))
        originMarker.icon = #imageLiteral(resourceName: "pickupActive")
        originMarker.appearAnimation = .none
        originMarker.isDraggable = false
        originMarker.isTappable = false
        originMarker.userData = "origin"
        originMarker.tracksInfoWindowChanges = true
        
        let destinationMarker = mapView.addMarker(position: CLLocationCoordinate2D(latitude: ride.destinationLatitude, longitude: ride.destinationLongitude))
        destinationMarker.icon = #imageLiteral(resourceName: "dropoffActive")
        destinationMarker.appearAnimation = .none
        destinationMarker.isDraggable = false
        destinationMarker.isTappable = false
        destinationMarker.userData = "destination"
        destinationMarker.tracksInfoWindowChanges = true
        
        if let driverPos = rideViewModel.driverPos {
            let driverMarker = mapView.addMarker(position: driverPos, icon: #imageLiteral(resourceName: "DriverCarImage"))
            driverMarker.userData = "driver"
            if let eta = rideViewModel.eta, ride.isDriverEnRoute {
                if eta < 1 {
                    driverMarker.title = "\("ride_arriving_in".localize()) \("ride_eta_less_one_minute".localize())"
                } else if eta == 1 {
                    driverMarker.title = "\("ride_arriving_in".localize()) \("ride_eta_one_minute".localize())"
                } else {
                    driverMarker.title = "\("ride_arriving_in".localize()) \(Int(eta)) \("ride_eta_minutes".localize())"
                }
                mapView.selectedMarker = driverMarker
            } else {
                driverMarker.title = nil
            }
        }

        if let currentPosLat = Defaults.userLatitude?.rounded(toPlaces: 8),
           let currentPosLon = Defaults.userLongitude?.rounded(toPlaces: 8), ride.originFixedStopId != nil, let location = rideViewModel.location, isRideStatusVisible(ride: ride) {
            let currentPosition = CLLocationCoordinate2D(latitude: currentPosLat, longitude: currentPosLon)
            let pickupPosition = CLLocationCoordinate2D(latitude: ride.originLatitude, longitude: ride.originLongitude)
            if location.riderPickupDirections {
                let line = Polyline(origin: currentPosition, destination: pickupPosition, transportation: .walking)
                mapView.fetchAndDraw(polyline: line)
            }
        }
    }
    
    func makeMapStatusSignature(ride: Ride, mapView: MapView) -> String {
        return mapView.getMarkersSignature() + "-\(ride.statusValue)"
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
        
    class Coordinator: NSObject {
        var parent: MapViewRepresentable
        var mapStatusSignature: String?
        var mapOffset: CGFloat
        
        init(_ parent: MapViewRepresentable) {
            self.parent = parent
            self.mapStatusSignature = nil
            self.mapOffset = 0.0
        }
    }
}

struct DraggableSheetView<Content: View>: View {
    @Binding var position: RideSUIView.BottomSheetPosition
    let content: Content
    @GestureState private var translation: CGFloat = 0
    @State private var predictedEndLocation: CGFloat = 0

    let componentHeights: [String: CGFloat]
    
    init(position: Binding<RideSUIView.BottomSheetPosition>,
         componentHeights: [String: CGFloat],
         @ViewBuilder content: () -> Content) {
        self._position = position
        self.content = content()
        self.componentHeights = componentHeights
    }
    
    var body: some View {
        GeometryReader { geometry in
            content
                .frame(width: geometry.size.width, height: geometry.size.height)
                .offset(y: maxOffset(geometry))
                .offset(y: translation)
                .animation(.interpolatingSpring(stiffness: 300, damping: 30), value: position)
                .gesture(
                    DragGesture()
                        .updating($translation) { value, state, _ in
                            state = value.translation.height
                        }
                        .onChanged { value in
                            // Update predicted end location based on velocity
                            let velocity = value.predictedEndLocation.y - value.location.y
                            predictedEndLocation = velocity
                        }
                        .onEnded { value in
                            let snapDistance = geometry.size.height * 0.5
                            let snapPoint = value.translation.height + maxOffset(geometry)
                            
                            // Check velocity for flick gesture
                            let velocity = value.predictedEndLocation.y - value.location.y
                            
                            // If velocity is high enough, use it to determine direction
                            if abs(velocity) > 300 {
                                position = velocity > 0 ? .bottom : .top
                            } else {
                                // Otherwise use position
                                position = snapPoint > snapDistance ? .bottom : .top
                            }
                        }
                )
        }
    }
    
    private func maxOffset(_ geometry: GeometryProxy) -> CGFloat {
        
        let statusHeight = componentHeights["rideStatus", default: 0]
        let driverHeight = componentHeights["driverInfo", default: 0]
        let routeHeight = componentHeights["routeInfo", default: 0]
        let adHeight = componentHeights["adCarousel", default: 0]
        let surveyHeight = componentHeights["survey", default: 0]
                
        var hasBottomSafeArea: Bool {
            if #available(iOS 15.0, *) {
                let scene = UIApplication.shared.connectedScenes
                    .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene
                return scene?.keyWindow?.safeAreaInsets.bottom ?? 0 > 0
            } else {
                return UIApplication.shared.windows.first?.safeAreaInsets.bottom ?? 0 > 0
            }
        }
        
        let marginOffset = hasBottomSafeArea ? 48.0 : 16.0
        
        let top_offset = geometry.size.height - (statusHeight + driverHeight + routeHeight + adHeight + surveyHeight) + marginOffset
        
        switch position {
        case .top:
            return top_offset
        case .bottom:
            let bottom_offset  = top_offset + routeHeight + surveyHeight
            return bottom_offset
        }
    }
}

struct HandleIndicatorView: View {
        
    @Binding var position: RideSUIView.BottomSheetPosition

    var body:some View {
        SwiftUI.Button(action: {
            withAnimation(.interpolatingSpring(stiffness: 300, damping: 30)) {
                position = position == .top ? .bottom : .top
            }
        }) {
            RoundedRectangle(cornerRadius: 5)
                .fill(Color.gray)
                .frame(width: 40, height: 5)
                .padding(.top, 10)
        }
    }
}

struct RideStatusView: View {
    @Binding var position: RideSUIView.BottomSheetPosition
    @Binding var showWaitingTimeInfo: Bool
    @ObservedObject var rideViewModel: RideViewModel
    
    var body: some View {
        let ride = rideViewModel.ride
        let eta = rideViewModel.eta
        let stops = rideViewModel.stops
        
        if isRideStatusVisible(ride: ride) {
            let (statusTitle, statusInfo, statusIcon) = getRideStatusElements(ride: ride, stops: stops ?? -1)
            
            VStack(spacing: 0) {
                HandleIndicatorView(position: $position)
                HStack {
                    VStack(spacing: 5) {
                        HStack {
                            Image(statusIcon)
                                .font(.system(size: 16.0))
                                .foregroundStyle(ride.status == .driverArrived ? .white : SwiftUITheme.Colors.seaFoam)
                            Text(statusTitle)
                                .font(SwiftUITheme.Fonts.subtitle8)
                                .foregroundStyle(ride.status == .driverArrived ? .white : .black)
                            if (ride.status != .driverArrived) {
                                SwiftUI.Button(
                                    action: {
                                        showWaitingTimeInfo = true
                                    },
                                    label: {
                                        Image(systemName: "info.circle")
                                            .foregroundStyle(SwiftUITheme.Colors.placeholderGray)
                                    }
                                )
                            }
                            Spacer()
                        }
                        Text(statusInfo)
                            .font(SwiftUITheme.Fonts.body2)
                            .foregroundStyle(ride.status == .driverArrived ? .white : .black)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    if eta != nil, ride.status != .driverArrived {
                        Text("\(eta!) \(eta! == 1 ? "min" : "mins")")
                            .font(SwiftUITheme.Fonts.subtitle8)
                            .padding(.vertical, 8)
                            .padding(.horizontal, 12)
                            .background(Capsule().fill(SwiftUITheme.Colors.seaFoam))
                            .foregroundColor(SwiftUITheme.Colors.white)
                    }
                }
                .padding(.vertical, 16)
            }
            .padding(.horizontal, 20)
        }
    }
    
    func getRideStatusElements(ride: Ride, stops: Int) -> (String, String, String) {
        if ride.isDriverArrived {
            var driverStatus = "ride_driver_arrived_now".localize()
            if let arrivalTime = ride.driverArrivedTimestamp {
                let timeSinceArrival = Int((Date().timeIntervalSince(arrivalTime)) / 60)
                let timeLeft = 3 - timeSinceArrival
                if timeLeft > 0 && timeLeft < 4 {
                    // i.e.: "Please meet them within 3 minutes"
                    driverStatus = "\("ride_driver_arrive_within".localize()) \(timeLeft) \("minute".localize())\((timeLeft) == 1 ? "" : "s")."
                }
            }
            return ("ride_driver_arrived".localize(), driverStatus, "where_to_vote")
        } else if stops > 0 {
            // i.e.: "Your driver has 2 stops before your pickup"
            return ("ride_your_ride_is_in_queue".localize(), "\("ride_your_driver_has".localize()) \(stops) \("stop".localize())\(stops == 1 ? "" : "s") \("ride_before_your_pickup".localize()).", "avg_pace")
        } else {
            var title = "ride_be_ready_for_pickup".localize()
            if ride.originFixedStopId != nil {
                title = title + " " + "ride_go_to_stop_short".localize()
            }
            return ("ride_driver_is_on_the_way".localize(), title, "hourglass_top")
        }
    }
}

func isRideStatusVisible(ride: Ride) -> Bool {
    return ride.status != .rideInProgress
}

struct RouteInfoView: View {
    @ObservedObject var rideViewModel: RideViewModel
    
    var body: some View {
        let ride = rideViewModel.ride
        VStack(spacing: 0) {
            if rideViewModel.isPooling {
                HStack {
                    Image("diversity")
                        .foregroundStyle(SwiftUITheme.Colors.seaFoam)
                        .font(.system(size: 14.0))
                    Text("ride_pooling_tag".localize())
                        .font(SwiftUITheme.Fonts.body2)
                }
                .background(.white)
                .padding(.horizontal, 10)
                .padding(.bottom, 8)
            }
            
            Divider()
            
            HStack {
                VStack {
                    Image("ic_route")
                }
                VStack(spacing: 10) {
                    VStack() {
                        Text("Pickup".localize())
                            .font(SwiftUITheme.Fonts.subtitle9)
                            .foregroundStyle(SwiftUITheme.Colors.darkGray)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Text(ride.originAddress)
                            .font(SwiftUITheme.Fonts.body2)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    VStack() {
                        Text("Dropoff".localize())
                            .font(SwiftUITheme.Fonts.subtitle9)
                            .foregroundStyle(SwiftUITheme.Colors.darkGray)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Text(ride.destinationAddress)
                            .font(SwiftUITheme.Fonts.body2)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }
            .padding(.vertical, 16)
            
        }
        .padding(.horizontal, 20)
    }
}

struct DriverInfoView: View {
    @Binding var position: RideSUIView.BottomSheetPosition

    @ObservedObject var rideViewModel: RideViewModel
    var delegate: RideSUIDelegate
    
    var body: some View {
        let ride = rideViewModel.ride
        VStack(spacing: 0) {
            if !isRideStatusVisible(ride: ride) {
                HandleIndicatorView(position: $position)
            }
            HStack {
                if let driverPhoto = ride.driverPhoto, !driverPhoto.trim().isEmpty, let driverPhotoURL = URL(string: driverPhoto) {
                    LazyImage(url: driverPhotoURL) { state in
                        if let image = state.image {
                            image
                                .resizable()
                        } else {
                            ProgressView()
                        }
                    }
                    .frame(width: 50, height: 50)
                    .cornerRadius(8.0)
                }
                VStack {
                    Text(ride.driverName)
                        .font(SwiftUITheme.Fonts.subtitle1)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    HStack {
                        if let driverLicense = ride.licensePlate, !driverLicense.isBlank() {
                            Text(driverLicense)
                                .font(SwiftUITheme.Fonts.subtitle8)
                            Image("airport_shuttle")
                                .foregroundStyle(SwiftUITheme.Colors.seaFoam)
                                .font(.system(size: 18.0))
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                if isRideStatusVisible(ride: ride) {
                    SwiftUI.Button(action: {
                        delegate.didSelectManageRide()
                    }) {
                        Text("Manage Ride".localize())
                            .font(SwiftUITheme.Fonts.subtitle8)
                            .padding(.vertical, 8)
                            .padding(.horizontal, 16)
                            .background(Color.white)
                            .foregroundColor(Color(Theme.Colors.seaFoam))
                            .overlay(
                                Capsule()
                                    .stroke(Color(Theme.Colors.seaFoam), lineWidth: 2)
                            )
                            .clipShape(Capsule())
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
    }
}

struct SurveyView: View {
    @ObservedObject var rideViewModel: RideViewModel
    var onSurveyAnswered: () -> Void
    @State private var showOptionsVC = false
    
    var body: some View {
        if let survey = rideViewModel.survey {
            VStack(spacing: 0) {
                Divider()
                
                VStack {
                    Text(survey.title)
                        .font(SwiftUITheme.Fonts.body2)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        
                    HStack {
                        Spacer()
                        SwiftUI.Button(action: {
                            showOptionsVC = true
                        }) {
                            Text("Answer".localize())
                                .font(SwiftUITheme.Fonts.subtitle8)
                                .foregroundColor(Color(Theme.Colors.seaFoam))
                        }
                    }
                }
                .padding(.vertical, 16)
            }
            .padding(.horizontal, 20)
            .background(
                SurveyViewControllerWrapper(
                    survey: survey,
                    ride: rideViewModel.ride,
                    isPresented: $showOptionsVC,
                    onDismiss: {
                        showOptionsVC = false
                    },
                    onAnswer: {
                        showOptionsVC = false
                        onSurveyAnswered()
                    }
                )
            )
        }
    }
}

struct SurveyViewControllerWrapper: UIViewControllerRepresentable {
    let survey: Survey
    let ride: Ride
    @Binding var isPresented: Bool
    let onDismiss: () -> Void
    let onAnswer: () -> Void
    
    func makeUIViewController(context: Context) -> UIViewController {
        return UIViewController()
    }
    
    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        if isPresented {
            guard uiViewController.presentedViewController == nil else {
                return
            }

            let optionsVC = OptionsViewController()
            optionsVC.delegate = context.coordinator
            optionsVC.configure(
                with: survey.title,
                tracker: .ga4,
                trackerEventKey: survey.trackingEventName,
                rideId: ride.id,
                options: survey.localizedQuestions
            )
            optionsVC.isModalInPresentation = true
            optionsVC.modalPresentationStyle = .pageSheet
            context.coordinator.viewController = uiViewController
            uiViewController.present(optionsVC, animated: true)
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }
    
    class Coordinator: NSObject, OptionsViewDelegate {
        let parent: SurveyViewControllerWrapper
        weak var viewController: UIViewController?
        
        init(parent: SurveyViewControllerWrapper) {
            self.parent = parent
        }

        // MARK: - OptionsViewDelegate
        
        func didSelectOptionValue(vc: OptionsViewController, value: String) {
            self.parent.onDismiss()
        }
        
        func didSelectOptionIndex(vc: OptionsViewController, indexPath: IndexPath) {
            guard let answer = parent.survey.questions[safe: indexPath.row] else {
                 self.parent.onDismiss()
                return
            }
                        
            if answer.lowercased() == "other" {
                // "Other" option
                let alert = UIAlertController(title: "Survey".localize(), message: parent.survey.title, preferredStyle: .alert)
                alert.addAction(UIAlertAction(title: "Submit".localize(), style: .default, handler: { [weak weakAlert = alert, weak self] _ in
                    let customAnswer = weakAlert?.textFields?.first?.text?.trim() ?? ""
                    vc.sendDataToEventTracker(option: "Other: \(customAnswer)")
                    self?.parent.survey.markHasAnswered()
                    self?.parent.onAnswer()
                }))
                alert.addTextField()
                viewController?.present(alert, animated: true)
            } else {
                vc.sendDataToEventTracker(option: answer)
                parent.survey.markHasAnswered()
                parent.onAnswer()
            }
        }
        
        func didNotSelectOption() {
            self.parent.onDismiss()
        }
    }
    
}
