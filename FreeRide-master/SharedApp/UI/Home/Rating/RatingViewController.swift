//
//  RatingViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 11/28/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit
import MessageUI
import StoreKit
import Stripe

struct RideSummary {
    let id: String
    let originAddress: String?
    let destinationAddress: String?
    #if RIDER
    var isRated: Bool?
    let driverName: String
    let paymentStatus: String?
    let totalPrice: Int32
    let discount: Int32
    let totalWithoutDiscount: Int32
    let currency: String?
    let tipTotal: Int32
    let tipCurrency: String?
    let rating: Int32
    #elseif DRIVER
    let riderName: String?
    #endif
    
    #if RIDER
    init(with ride: Ride) {
        self.id = ride.id
        self.originAddress = ride.originAddress
        self.destinationAddress = ride.destinationAddress
        self.isRated = ride.isRated
        self.driverName = ride.driverName
        self.paymentStatus = ride.paymentStatus
        self.totalPrice = ride.totalPrice
        self.discount = ride.discount
        self.totalWithoutDiscount = ride.totalWithoutDiscount
        self.currency = ride.currency
        self.tipTotal = ride.tipTotal
        self.tipCurrency = ride.tipCurrency
        self.rating = ride.rating
    }
    #elseif DRIVER
    init(with ride: Ride) {
        self.id = ride.id
        self.originAddress = ride.originAddress
        self.destinationAddress = ride.destinationAddress
        self.riderName = ride.riderName
    }
    #endif
}

class RatingViewController: FormViewController {

    private let feedbackField: TextField = {
        let field = TextField()
        field.configure(name: "Leave some feedback...".localize(), placeholder: "Feedback".localize())
        field.image = #imageLiteral(resourceName: "EmailBadge")
        return field
    }()

    private var rideSummary: RideSummary!
    private var reportReason: String?
    private var paymentMethodAdded = false
    private var toReportOnly: Bool = false
    
    private let ratingView: RatingRideView = .instantiateFromNib()
    
    func setRide(ride: Ride!, toReportOnly: Bool = false) {
        self.rideSummary = RideSummary(with: ride)
        self.toReportOnly = toReportOnly
    }

    private func configureRatingView(_ rating: Int) {
        #if DRIVER
        if rating == 1 {
            confirmationButtonTitle = "Report Rider"
            let vc = OptionsViewController()
            vc.delegate = self
            vc.configureForDelegate(with: "Please select a reason to report the rider. You can add more info on the feedback field.", options: riderReportReasons)
            self.present(vc, animated: true)
        } else {
            reportReason = nil
            confirmationButtonTitle = "Submit Feedback"
            ratingView.configureReportReason(nil)
        }
        #endif
    }
    
    override func viewDidLoad() {
        leftNavigationStyle = .back
        leftNavigationAction = .pop(true)
        
        #if RIDER
        Notification.addObserver(self, name: .didUpdatePaymentMethod, selector: #selector(paymentMethodDidUpdate))
        title = "Thank you for Riding".localize()
        confirmationButtonTitle = "general_done".localize()
        #elseif DRIVER
        title = "Rate your Rider"
        confirmationButtonTitle = "Submit Feedback"
        if toReportOnly {
            ratingView.setRatingForReport()
            configureRatingView(1)
        }
        #endif
        
        alternateButtonTitle = "Contact Us".localize()
        bottomView.isAlternateButtonLast = true
        fields = [feedbackField]
        super.viewDidLoad()
        ratingView.delegate = self
        
        guard let location = context.dataStore.currentLocation() else {
            return
        }
        
        checkPaymentSettings()
        ratingView.configure(with: rideSummary, location: location)
    }

    override func addViewsBeforeFields() {
        formStackView.addArrangedSubview(ratingView)
        fieldsParentStackView.alignment = .top
    }

    override func handleAlternateAction() {
        
        #if DRIVER
        
        guard MFMailComposeViewController.canSendMail() else {
            presentAlert("Unable to Email".localize(), message: "Sorry, sending emails from your device is not currently configured properly.".localize())
            return
        }
        
        let composeVC = MFMailComposeViewController()
        composeVC.mailComposeDelegate = self
        // Configure the fields of the interface.
        composeVC.setToRecipients(["info@ridecircuit.com"])
        composeVC.setSubject("Ride Feedback (#\(rideSummary.id))")
        composeVC.setMessageBody("Ride: (#\(rideSummary.id))", isHTML: false)
        present(composeVC, animated: true)
        
        #elseif RIDER
        
        guard let url = URL(string: "https://www.ridecircuit.com/app-contact") else { return }
        UIApplication.shared.open(url)
        
        #endif
    }

    override func handleConfirmationAction() {
        let rating = ratingView.rating

        guard rating > 0, rating <= 5 else {
            presentAlert("Rate Ride".localize(), message: "Please make sure to give your ride a rating between 1 and 5 stars.".localize()
            )
            return
        }
        
        #if RIDER
                        
        if (ratingView.driverTip > 0) {
            if paymentMethodAdded {
                chargeTipValue()
            } else {
                let vc = CreditCardViewController()
                self.present(vc, animated: true)
            }
        } else {
            rateRide()
        }
        
        #elseif DRIVER
    
        if rating == 1 {
            if reportReason == nil {
                self.configureRatingView(1)
                return
            }
            
            let feedback = feedbackField.trimmedText
            let confirm = UIAlertAction(title: "Yes", style: .destructive, handler: { _ in
                let request = ReportRideRequest(reason: self.reportReason ?? "", feedback: feedback.isEmpty ? nil : feedback, ride: self.rideSummary.id)
                self.context.api.reportRide(request: request, completion: { result in
                    switch result {
                    case .success:
                        if self.toReportOnly {
                            self.navigationController?.popViewController(animated: true)
                        } else {
                            self.rateRide(true)
                        }
                    case .failure(let error):
                        self.presentAlert(for: error)
                    }
                })
            })

            self.presentAlert("Report Rider", message: "Are you sure you want to file a report on the rider for this ride?", cancel: "Cancel", confirm: confirm)
        } else {
            self.rateRide()
        }
                
        #endif
         
    }
    
    @objc private func paymentMethodDidUpdate() {
        checkPaymentSettings(true)
    }
    
    func rateRide(_ fromReport : Bool = false) {
        ProgressHUD.show()
        let feedback = feedbackField.trimmedText
        let request = RateRideRequest(ride: rideSummary.id, rating: ratingView.rating, feedback: feedback.isEmpty ? nil : feedback)
        context.api.rateRide(request) { result in
            ProgressHUD.dismiss()
            
            switch result {
            case .success( _):
                #if RIDER
                
                self.rideSummary.isRated = true
                self.context.dataStore.save()
                
                MixpanelManager.trackEvent(
                    MixpanelEvents.RIDER_RIDE_RATED,
                    properties: [
                        "ride_id": self.rideSummary.id,
                        "rating" : self.ratingView.rating
                    ]
                )
                
                if #available(iOS 10.3, *) {
                    var lastReviews = Defaults.lastThreeRatings ?? []
                    if lastReviews.count < 3 {
                        lastReviews.append(self.ratingView.rating)
                    } else {
                        lastReviews[0] = lastReviews[1]
                        lastReviews[1] = lastReviews[2]
                        lastReviews[2] = self.ratingView.rating
                    }
                    Defaults.lastThreeRatings = lastReviews
                    
                    let onlyPositiveReviews = lastReviews.count == 3 &&
                        !lastReviews.contains(3) &&
                        !lastReviews.contains(2) &&
                        !lastReviews.contains(1) &&
                        !lastReviews.contains(0)
                    
                    if !Defaults.wasReviewedOnAppStore && onlyPositiveReviews {
                        SKStoreReviewController.requestReview()
                        Defaults.wasReviewedOnAppStore = true
                        MixpanelManager.trackEvent(MixpanelEvents.RIDER_APP_STORE_RATING_PROMPT)
                    }
                }
                
                let badRating = self.ratingView.rating < 3
                
                if badRating {
                    let vc = OptionsViewController()
                    vc.configure(
                        with: "ride_rating_reason".localize(),
                        tracker: .mixpanel,
                        trackerEventKey: MixpanelEvents.RIDER_RIDE_RATING_REASON,
                        rideId: self.rideSummary.id,
                        options: lowRideRatingOptions
                    )
                    self.present(vc, animated: true)
                }
                
                self.navigationController?.popViewController(animated: true)
                
                #elseif DRIVER
                
                MixpanelManager.trackEvent(
                    MixpanelEvents.DRIVER_RIDE_RATED,
                    properties: [
                        "ride_id": self.rideSummary.id,
                        "rating" : self.ratingView.rating
                    ]
                )
                self.navigationController?.popViewController(animated: true)
                
                if fromReport {
                    self.navigationController?.presentAlert("Rider Reported", message: "Your report has been successfully submitted.")
                }
                
                #endif
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }
    
    private func checkPaymentSettings(_ afterChargingTip : Bool = false) {
        #if RIDER
        guard let location = context.dataStore.currentLocation() else {
            return
        }
        let query = LocationIdQuery(locationId: location.id)
        context.api.getPaymentSettings(query) { result in
            switch result {
            case .success(let response):
                self.paymentMethodAdded = response.hasPaymentMethod
                if self.paymentMethodAdded && afterChargingTip {
                    self.chargeTipValue()
                }
                break
            case .failure(_):
                break
            }
        }
        #endif
    }
    
    func chargeTipValue() {
        #if RIDER
        let driverTip = ratingView.driverTip
        if driverTip == 0 {
            return
        }
        ProgressHUD.show()
        let req = TipRequest(rideId: rideSummary.id, tipAmount: driverTip)
        context.api.requestTipIntent(req) { result in
            ProgressHUD.dismiss()
            switch result {
            case .success(let response):
                guard let clientSecret = response.clientSecret else {
                    return
                }
                
                let paymentIntentParams = STPPaymentIntentParams(clientSecret: clientSecret)
                let paymentHandler = STPPaymentHandler.shared()
                ProgressHUD.show()
                paymentHandler.confirmPayment(paymentIntentParams, with: self) { (status, paymentIntent, error) in
                    ProgressHUD.dismiss()
                    switch (status) {
                    case .failed:
                        self.handlePaymentFailure(message: error?.localizedDescription ?? "", paymentIntentId: paymentIntent?.stripeId)
                        break
                    case .canceled:
                        self.handlePaymentFailure(message: error?.localizedDescription ?? "", paymentIntentId: paymentIntent?.stripeId)
                        break
                    case .succeeded:
                        guard let paymentIntent = paymentIntent else {
                            return
                        }
                        let req = ConfirmRequestRideRequest(paymentIntentStatus: paymentIntent.status.rawValue, paymentIntentId: paymentIntent.stripeId)
                        ProgressHUD.show()
                        self.context.api.requestTipConfirmation(req) { result in
                            ProgressHUD.dismiss()
                            switch result {
                            case .success(_):
                                MixpanelManager.trackEvent(
                                    MixpanelEvents.RIDER_RIDE_TIP_CHARGED,
                                    properties: [
                                        "ride_id": self.rideSummary.id,
                                        "ride_tip": driverTip
                                    ]
                                )
                                MixpanelManager.incrementUserTipValue(value: driverTip)
                                self.rateRide()
                            case .failure(let error):
                                self.presentAlert(for: error)
                            }
                        }
                        break
                    @unknown default:
                        fatalError()
                        break
                    }
                }
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
        #endif
    }
    
    func handlePaymentFailure(message: String, paymentIntentId: String?) {
        #if RIDER
        if let intentId = paymentIntentId {
            let req = TipCancelationRequest(paymentIntentId: intentId)
            self.context.api.requestTipCancelation(req) { result in
                switch result {
                case .success(_):
                    break
                case .failure(let error):
                    self.presentAlert(for: error)
                }
            }
        }
        let confirm = UIAlertAction(title: "payments_add_pm".localize(), style: .default) { _ in
            let vc = CreditCardViewController()
            self.present(vc, animated: true)
        }
        presentAlert("payments_payment_error".localize(), message: "payments_payment_error_info".localize(), cancel: "general_cancel".localize(), confirm: confirm)
        #endif
    }
}

extension RatingViewController: MFMailComposeViewControllerDelegate {

    func mailComposeController(_ controller: MFMailComposeViewController, didFinishWith result: MFMailComposeResult, error: Error?) {
        controller.dismiss(animated: true)

        switch result {
        case .sent:
            presentAlert("Feedback Sent".localize(), message: "Thank you for your feedback!".localize())
        case .failed:
            presentAlert("Failed Sending".localize(), message: "We were unable to send this email at this time.".localize())
        default:
            break
        }
    }
}

extension RatingViewController: RatingRideViewDelegate {
    func didSelectRating(rating: Int) {
        #if DRIVER
        self.configureRatingView(rating)
        #endif
    }
    
    func didSelectReason() {
        #if DRIVER
        self.configureRatingView(1)
        #endif
    }
}

extension RatingViewController: OptionsViewDelegate {
    func didSelectOptionValue(vc: OptionsViewController, value: String) {
        reportReason = value
        ratingView.configureReportReason(reportReason)
    }
    func didSelectOptionIndex(vc: OptionsViewController, indexPath: IndexPath) {}
    func didNotSelectOption() {}
}

extension RatingViewController: STPAuthenticationContext {
    func authenticationPresentingViewController() -> UIViewController {
        return self
    }
}
