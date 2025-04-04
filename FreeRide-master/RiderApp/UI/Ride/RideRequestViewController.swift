//
//  RequestViewController.swift
//  FreeRide
//

import UIKit

protocol RideRequestViewDelegate: AnyObject {
    func requestRide(request: Request)
    func requestRide(request: Request, paymentValue: Int)
}

struct Request {

    var origin: Address?
    var destination: Address?
    var passengers = 1

    func isValid() -> Bool {
        guard passengers > 0, self.addressesAreValid() else {
                return false
        }
        return true
    }

    func addressesAreValid() -> Bool {
        guard let origin = origin,
            let destination = destination,
            origin.isValid ?? false,
            destination.isValid ?? false else {
                return false
        }
        return true
    }
}

class RideRequestViewController: FormViewController {
    
    var paymentMethodAdded = true
    var poweredByCopy: String?
    var paymentType: PaymentType = .free
    var paymentSubType: PaymentSubType?
    var locationPaymentInfo: LocationPaymentInfo?
    var quotePaymentInformation: PaymentInformation?
    var request = Request()
    
    weak var delegate: RideRequestViewDelegate?
    
    lazy var requestMapView: RequestMapView = {
        let view: RequestMapView = .instantiateFromNib()
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    lazy var passengersView: PassengerPickerView = {
        let view: PassengerPickerView = .instantiateFromNib()
        view.translatesAutoresizingMaskIntoConstraints = false
        view.delegate = self
        return view
    }()
    
    lazy var pwywView: PaymentPickerView = {
        let view: PaymentPickerView = .instantiateFromNib()
        view.translatesAutoresizingMaskIntoConstraints = false
        view.delegate = self
        return view
    }() 
    
    lazy var accessibilityView: AccessibilityOptionsView = {
        let view: AccessibilityOptionsView = .instantiateFromNib()
        view.translatesAutoresizingMaskIntoConstraints = false
        view.delegate = self
        return view
    }()
    
    lazy var quoteView: QuoteInfoView = {
        let view: QuoteInfoView = .instantiateFromNib()
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    func isPaidPwyw() -> Bool {
        return paymentType == .paid && paymentSubType == .pwyw
    }
    
    func isPaidFixed() -> Bool {
        return paymentType == .paid && paymentSubType == .fixedPayment
    }
    
    override func viewDidLoad() {
       
        leftNavigationStyle = .back
        leftNavigationAction = .dismiss(true)
        
        super.viewDidLoad()

        setBottomButtonAndInfo()
        checkUserPaymentSettings() { error in
            self.getQuote()
        }

        Notification.addObserver(self, name: .didUpdatePaymentMethod, selector: #selector(paymentMethodDidUpdate))
    }
    
    func setBaseRequest(pickup: Address, dropoff: Address, locationPaymentInfoResponse: LocationPaymentInfoResponse) {
        request.origin = pickup
        request.destination = dropoff
        request.passengers = 1
        
        requestMapView.setLocations(pickup: request.origin, dropoff: request.destination)
        passengersView.setPassengerNumber(passengers: request.passengers)
        
        paymentType = locationPaymentInfoResponse.type
        paymentSubType = locationPaymentInfoResponse.subType
        locationPaymentInfo = locationPaymentInfoResponse.paymentInformation

        if let pBc = locationPaymentInfoResponse.poweredByCopy, !pBc.isEmpty {
            poweredByCopy = pBc
        }
    }
    
    func setQuotePaymentInformation(_ paymentInformation: PaymentInformation?) {
        self.quotePaymentInformation = paymentInformation
        
        guard let paymentInfo = paymentInformation else {
            return
        }
        
        var quoteValue = paymentInfo.getShortQuoteInfo()

        if paymentInfo.isPromocodeValid ?? false, let promocode = paymentInfo.promocodeCode, isPaidPwyw() {
            if paymentInfo.totalPrice != paymentInfo.totalWithoutDiscount {
                quoteValue = quoteValue + ". \("pwyw_quote_info".localize()) \(promocode)"
            }
        }
        
        quoteView.setQuote(quote: quoteValue)
        addPoweredByIfNeeded()
        
        if paymentInfo.isPromocodeValid ?? false, self.isPaidPwyw(), self.pwywView.baseIsSelected() {
            self.pwywView.updateBaseValue(value: paymentInfo.totalPrice)
        }
        
        setBottomButtonAndInfo()
    }
    
    private func getQuote() {
        guard let location = context.dataStore.currentLocation(), let originLat = request.origin?.latitude, let originLon = request.origin?.longitude, let destinationLat = request.destination?.latitude, let destinationLon = request.destination?.longitude, paymentType != .free else {
            return
        }
        
        let query = QuoteQuery(
            locationId: location.id,
            passengers: request.passengers,
            originLatitude: originLat,
            originLongitude: originLon,
            destinationLatitude: destinationLat,
            destinationLongitude: destinationLon,
            pwywValue: isPaidPwyw() ? pwywView.paymentValue : nil
        )
        
        context.api.getQuote(query) { result in
            switch result {
            case .success(let response):
                self.setQuotePaymentInformation(response)
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }
        
    func needCreditCardFirst() -> Bool {
        if paymentMethodAdded {
            return false
        }

        if let quotePaymentInformation {
            return quotePaymentInformation.totalPrice > 0
        }

        return isPaymentMethodRequired()
    }

    func isPaymentMethodRequired() -> Bool {
        if isPaidPwyw() && pwywView.paymentValue > 0 {
            return true
        }

        if isPaidFixed() {
            return true
        }

        return false
    }

    func setBottomButtonAndInfo() {
        if needCreditCardFirst() {
            quoteView.setQuote(quote: "payments_title_info_required".localize())
            confirmationButtonTitle = "payments_add_pm".localize()
            bottomView.confirmationButton.isEnabled = true
        } else {
            confirmationButtonTitle = "ride_request".localize()
            bottomView.confirmationButton.isEnabled = request.isValid()
        }
    }

    func addPoweredByIfNeeded() {
        if let pBc = poweredByCopy {
            var pBcInfo = pBc
            if let quote = quoteView.quoteLabel.text, !quote.isEmpty {
                pBcInfo += " " + quote + "."
            }
            quoteView.setQuote(quote: pBcInfo)
        }
    }
    
    override func addViewsBeforeFields() {
        formStackView.addArrangedSubview(requestMapView)
        formStackView.addArrangedSubview(passengersView)
        
        guard let location = context.dataStore.currentLocation() else {
            return
        }
        
        let accessibilityEnabled = Defaults.showAccessibilityOnRequest && location.isADA
        if accessibilityEnabled {
            formStackView.addArrangedSubview(accessibilityView)
        }
        
        if isPaidPwyw() {
            formStackView.addArrangedSubview(pwywView)
            pwywView.update(with: locationPaymentInfo)
            pwywView.resetPwywControl()
            formStackView.addArrangedSubview(quoteView)
            getQuote()
        } else if isPaidFixed() {
            pwywView.paymentValue = 0
            formStackView.addArrangedSubview(quoteView)
            getQuote()
        } else if paymentType == .free && paymentSubType == .ageRestriction {
            formStackView.addArrangedSubview(quoteView)
            quoteView.setQuote(quote: "good_news_age_restriction".localize())
        } else if poweredByCopy != nil {
            formStackView.addArrangedSubview(quoteView)
            quoteView.setQuote(quote: "")
        } else {
            pwywView.paymentValue = 0
        }
        addPoweredByIfNeeded()
    }

    override func handleConfirmationAction() {
        if needCreditCardFirst() {
            let vc = CreditCardViewController()
            present(vc, animated: true)
        }
        else {
            requestRide()
            dismiss(animated: true)
        }
    }

    private func requestRide() {
        if isPaidPwyw() {
            delegate?.requestRide(request: request, paymentValue: pwywView.paymentValue)
        } else {
            delegate?.requestRide(request: request)
        }
    }

    private func checkUserPaymentSettings(completion: @escaping (Error?) -> Void) {
        guard let location = context.dataStore.currentLocation() else {
            return
        }
        let query = LocationIdQuery(locationId: location.id)
        context.api.getPaymentSettings(query) { result in
            switch result {
            case .success(let response):
                self.paymentMethodAdded = response.hasPaymentMethod
                completion(nil)
            case .failure(let error):
                completion(error)
            }
        }
    }

    @objc private func paymentMethodDidUpdate() {
        checkUserPaymentSettings() { error in
            if error != nil {
                self.setBottomButtonAndInfo()
            }
            else {
                self.getQuote()
            }
        }
    }
    
    func showPwywInfo() {
        let vc = LegalViewController()
        vc.type = .pwyw
        navigationController?.pushViewController(vc, animated: true)
        MixpanelManager.trackEvent(MixpanelEvents.RIDER_PWYW_MORE_INFO)
    }
    
}

extension RideRequestViewController: PassengerPickerViewDelegate {
    func updatePassengerNumber(withPassengers passengers: Int) {
        request.passengers = passengers
        getQuote()
    }
}

extension RideRequestViewController: PaymentPickerViewDelegate {
    func updatePayment(withPayment payment: Int) {
        getQuote()
    }
}

extension RideRequestViewController: AccessibilityOptionsViewDelegate {
    func accessibilityOptionUpdated(withWAV: Bool) {
        if !withWAV {
            let alert = UIAlertController(title: nil, message: "accessibility_want_to_hide_accessibility_options_message".localize(), preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "accessibility_show_option_on_request_negative_option".localize(), style: .default, handler: { _ in
            }))
            alert.addAction(UIAlertAction(title: "accessibility_show_option_on_request_positive_option".localize(), style: .default, handler: { _ in
                Defaults.showAccessibilityOnRequest = false
            }))
            present(alert, animated: true, completion: nil)
        }
    }
}
