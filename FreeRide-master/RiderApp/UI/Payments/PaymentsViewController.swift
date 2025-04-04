//
//  PaymentsViewController.swift
//  FreeRide
//

import UIKit
import Stripe

class PaymentsViewController: FormViewController {

    var creditCardTitle: Label?
    var promocodeTitle: Label?
    
    private let pageView: TitlePageView = {
        let view: TitlePageView = .instantiateFromNib()
        view.style = .paymentsNotEnabled
        return view
    }()
    
    private let creditCardView: PaymentDetailView = {
        let view = PaymentDetailView()
        view.isHidden = true
        return view
    }()
    
    private let promocodeView: PromocodeDetailView = {
        let view = PromocodeDetailView()
        view.isHidden = true
        return view
    }()
    
    override func viewDidLoad() {
       
        leftNavigationStyle = .custom(#imageLiteral(resourceName: "round_menu_black_48pt"))
        leftNavigationAction = .toggleMenu
        title = "menu_payments".localize()
        
        view.backgroundColor = Theme.Colors.backgroundGray
        
        let headerView = UIView(backgroundColor: .clear)
        headerView.constrainHeight(20)
        topView.verticalStackView.addArrangedSubview(headerView)
        
        creditCardTitle = Label()
        creditCardTitle?.style = .subtitle6bluegray
        creditCardTitle?.text = "payments_payment_method".localize()

        promocodeTitle = Label()
        promocodeTitle?.style = .subtitle6bluegray
        promocodeTitle?.text = "payments_promocode".localize()
        
        addToFieldStack(pageView)
        pageView.isHidden = true
        
        addToFieldStack(creditCardTitle!)
        creditCardView.paymentDelegate = self
        addToFieldStack(creditCardView)
        
        addToFieldStack(promocodeTitle!)
        promocodeView.promocodeDelegate = self
        addToFieldStack(promocodeView)
        
        super.viewDidLoad()
        
        Notification.addObserver(self, name: .didUpdatePaymentMethod, selector: #selector(paymentMethodDidUpdate))
    
    }
    
    func addToFieldStack(_ view: UIView) {
        fieldsStackView.addArrangedSubview(view)
        view.pinHorizontalEdges(to: fieldsStackView, constant: 20)
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        getPaymentSettings()
    }
    
    @objc private func paymentMethodDidUpdate() {
        getPaymentSettings()
    }
    
    //PAYMENT SETTINGS ACTIONS
    
    func getPaymentSettings() {
        
        guard let location = context.dataStore.currentLocation() else {
            return
        }
                
        ProgressHUD.show()
        let query = LocationIdQuery(locationId: location.id)
        context.api.getPaymentSettings(query) { result in
            ProgressHUD.dismiss()
            self.handlePaymentSettingsResult(result)
        }
    }
    
    func handlePaymentSettingsResult(_ result: ServiceResult<PaymentSettingsResponse>) {
        switch result {
        case .success(let response):

            self.setCreditCardView(response.stripePaymentMethods.first)
            self.setPromocodeView(response.promocode)
            
            break
        case .failure(let error):
            self.presentAlert(for: error)
        }
    }
    
    func setCreditCardView(_ paymentMethod: StripePaymentMethod?) {
        self.creditCardView.isHidden = false
        guard let paymentMethod = paymentMethod else {
            self.creditCardView.configure(title: nil, info: "payments_no_payment_method".localize())
            return
        }
        
        self.creditCardView.configure(title: "\(paymentMethod.cardType.uppercased()) \("payments_ending_in".localize()) \(paymentMethod.last4digits)", info: nil)
    }
    
    func setPromocodeView(_ promocode: Promocode?) {
        self.promocodeView.isHidden = false
        guard let promocode = promocode else {
            self.promocodeView.configure(title: nil, info: "payments_no_pc_added".localize())
            return
        }
        self.promocodeView.configure(promocode)
    }
        
    //PAYMENT INTENT ACTIONS
    
    func requestPaymentIntent() {
        context.api.requestPaymentIntent { result in
            switch result {
            case .success(let response):
                let confirm = UIAlertAction(title: "Confirm Payment Intent", style: .default, handler: { _ in
                    self.confirmPaymentIntent(paymentClientSecret: response.clientSecret, paymentMethodId: response.paymentMethodId)
                })
                self.presentAlert("PAYMENT INTENT CREATED", message: "for \(response.amount / 100) \(response.currency)", cancel: nil, confirm: confirm)
                break
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }
    
    func confirmPaymentIntent(paymentClientSecret: String?, paymentMethodId: String?) {
        guard let paymentClientSecret = paymentClientSecret else {
            return;
        }
        
        guard let paymentMethodId = paymentMethodId else {
            return;
        }
        
        let paymentIntentParams = STPPaymentIntentParams(clientSecret: paymentClientSecret)
        paymentIntentParams.paymentMethodId = paymentMethodId
            
        // Submit the payment
        let paymentHandler = STPPaymentHandler.shared()
        paymentHandler.confirmPayment(paymentIntentParams, with: self) { (status, paymentIntent, error) in
            switch (status) {
            case .failed:
                self.presentAlert("PAYMENT FAILED", message: error?.localizedDescription ?? "")
                break
            case .canceled:
                self.presentAlert("PAYMENT CANCELED", message: error?.localizedDescription ?? "")
                break
            case .succeeded:
                let confirm = UIAlertAction(title: "Capture payment", style: .default, handler: { _ in
                    self.requestPaymentCapture(paymentIntent?.stripeId)
                })
                self.presentAlert(nil, message: "PAYMENT INTENT SUCCEEDED", cancel: nil, confirm: confirm)
                break
            @unknown default:
                fatalError()
                break
            }
        }
    }
    
    //PAYMENT CAPTURE ACTIONS
    
    func requestPaymentCapture(_ paymentIntendId: String?) {
        guard let paymentIntendId = paymentIntendId else {
            return;
        }
        
        let request = PaymentCaptureRequest(paymentIntentId: paymentIntendId)

        context.api.requestPaymentCapture(request) { result in
            switch result {
            case .success(let response):
                self.presentAlert("PAYMENT CAPTURED", message: "\(response.amount / 100) \(response.currency) charged")
                break
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }
 
}

extension PaymentsViewController: STPAuthenticationContext {
    func authenticationPresentingViewController() -> UIViewController {
        return self
    }
}

extension PaymentsViewController: PaymentDetailDelegate {
    func didSelectEdit() {
        let vc = CreditCardViewController()
        self.present(vc, animated: true)
    }
    
    func didSelectDelete() {
        let confirm = UIAlertAction(title: "payments_remove_payment".localize(), style: .default) { _ in
            guard let location = self.context.dataStore.currentLocation() else {
                return
            }
            
            ProgressHUD.show()

            let query = LocationIdQuery(locationId: location.id)
            self.context.api.removePaymentMethod(query) { result in
                ProgressHUD.dismiss()
                self.handlePaymentSettingsResult(result)
                Notification.post(.didUpdatePaymentMethod)
                MixpanelManager.trackEvent(MixpanelEvents.RIDER_PAYMENT_METHOD_REMOVED)
             }
        }
        presentAlert("general_are_you_sure".localize(), message: "payments_this_will_delete_pm".localize(), cancel: "general_no".localize(), confirm: confirm)
    }

}

extension PaymentsViewController: PromocodeDetailDelegate {
    func didSelectPromocodeEdit() {
        let vc = PromocodeViewController()
        self.present(vc, animated: true)
    }

    func didSelectPromocodeDelete() {
        let confirm = UIAlertAction(title: "payments_remove_promocode".localize(), style: .default) { _ in
            ProgressHUD.show()
            self.context.api.removePromocode { result in
                ProgressHUD.dismiss()
                self.handlePaymentSettingsResult(result)
                MixpanelManager.trackEvent(MixpanelEvents.RIDER_PROMOCODE_REMOVED)
            }
        }
        presentAlert("general_are_you_sure".localize(), message: "payments_this_will_remove_pc".localize(), cancel: "general_no".localize(), confirm: confirm)
    }

}
