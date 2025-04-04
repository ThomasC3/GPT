//
//  CreditCardViewController.swift
//  FreeRide
//
//  Created by Rui Magalhães on 15/04/2020.
//  Copyright © 2020 Rocket & Mouse Inc. All rights reserved.
//

import Foundation
import UIKit
import Stripe

extension Notification.Name {
    static let didUpdatePaymentMethod = Notification.Name("didUpdatePaymentMethod")
}

class CreditCardViewController: FormViewController {

    lazy var cardTextField: STPPaymentCardTextField = {
        let cardTextField = STPPaymentCardTextField()
        cardTextField.accessibilityIdentifier = "cardTextField"
        cardTextField.accessibilityLabel = "Credit Card text field"
        cardTextField.backgroundColor = Theme.Colors.white
        cardTextField.borderColor = Theme.Colors.white
        cardTextField.postalCodeEntryEnabled = false
        return cardTextField
    }()
    
    private lazy var addCardActionView: FormActionView = {
        let view: FormActionView = .instantiateFromNib()
        view.configure(button: "payments_save_card".localize(), accessibilityLabel: "accessibility_text_add_payment_method".localize(), action: {
            self.getPaymentSetup()
        })
        return view
    }()
    
    override func viewDidLoad() {
        
        actionViews = [addCardActionView]
        
        leftNavigationStyle = .close
        leftNavigationAction = .dismiss(true)
        
        title = "payments_add_pm".localize()
            
        view.backgroundColor = Theme.Colors.backgroundGray
        
        let headerView = UIView(backgroundColor: .clear)
        headerView.constrainHeight(20)
        topView.verticalStackView.addArrangedSubview(headerView)
        
        fieldsStackView.addArrangedSubview(cardTextField)
        cardTextField.translatesAutoresizingMaskIntoConstraints = false
        cardTextField.pinHorizontalEdges(to: fieldsStackView, constant: 20)
        
        cardTextField.borderColor = Theme.Colors.darkGray
        
        super.viewDidLoad()
    
    }
    
    //PAYMENT SETUP ACTIONS
    
    func getPaymentSetup() {
        ProgressHUD.show()
        context.api.requestPaymentSetup { result in
            ProgressHUD.dismiss()
            switch result {
            case .success(let response):
                self.confirmSetupIntent(response.clientSecret)
                break
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }
    
    func confirmSetupIntent(_ setupClientSecret: String?) {
        
        guard let setupClientSecret = setupClientSecret else {
            return;
        }
        
        // Collect card details
        let cardParams = cardTextField.cardParams

        // Collect the customer's email to know which customer the PaymentMethod belongs to.
        let billingDetails = STPPaymentMethodBillingDetails()
        
        // Create SetupIntent confirm parameters with the above
        let paymentMethodParams = STPPaymentMethodParams(card: cardParams, billingDetails:billingDetails, metadata: nil)
        let setupIntentParams = STPSetupIntentConfirmParams(clientSecret: setupClientSecret)
        setupIntentParams.paymentMethodParams = paymentMethodParams

        ProgressHUD.show()
        // Complete the setup
        let paymentHandler = STPPaymentHandler.shared()
        paymentHandler.confirmSetupIntent(setupIntentParams, with: self) { status, setupIntent, error in
            ProgressHUD.dismiss()
            switch (status) {
            case .failed:
                self.handlePaymentSetupFail(error?.localizedDescription ?? "")
                break
            case .canceled:
                self.handlePaymentSetupFail(error?.localizedDescription ?? "")
                break
            case .succeeded:
                Notification.post(.didUpdatePaymentMethod)
                MixpanelManager.trackEvent(MixpanelEvents.RIDER_PAYMENT_METHOD_ADDED)
                self.dismiss(animated: true)
                break
            @unknown default:
                fatalError()
                break
            }
        }
    }

    func handlePaymentSetupFail(_ errorMessage: String) {
        self.presentAlert("Adding payment method".localize() + " " + "failed".localize(), message: errorMessage)
        MixpanelManager.trackEvent(
            MixpanelEvents.RIDER_PAYMENT_SETUP_FAILED,
            properties: [
                "error" : errorMessage
            ]
        )
    }
 
}

extension CreditCardViewController: STPAuthenticationContext {
    func authenticationPresentingViewController() -> UIViewController {
        return self
    }
}
