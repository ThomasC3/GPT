//
//  PasswordViewController.swift
//  FreeRide
//

import UIKit

class PasswordViewController: FormViewController {

    var email: String!

    private lazy var pageView: TitlePageView = {
        let view: TitlePageView = .instantiateFromNib()
        view.style = .passwordConfirmation
        return view
    }()
    
    private let passwordField: TextField = {
        let field = TextField()
        field.configure(name: "user_password".localize(), placeholder: "user_password".localize())
        field.accessibilityIdentifier = "passwordTextField"
        field.validators = [RequiredValidator(), PasswordValidator()]
        field.image = #imageLiteral(resourceName: "LockBadge")
        field.isSecureTextEntry = true
        return field
    }()

    override func viewDidLoad() {
        fields = [passwordField]
        
        confirmationButtonTitle = "user_verify_email".localize()
        leftNavigationStyle = .back
        leftNavigationAction = .pop(true)
        
        super.viewDidLoad()
    }

    override func addViewsBeforeFields() {
        formStackView.addArrangedSubview(pageView)
        pageView.pinHorizontalEdges(to: formStackView)
    }

    override func handleConfirmationAction() {
        guard isValidWithError() else {
            return
        }
        
        ProgressHUD.show()
        
        let request = EmailVerificationReqRequest(email: self.email, password: passwordField.trimmedText)

        context.api.requestEmailVerification(request: request) { result in
            ProgressHUD.dismiss()
            switch result {
            case .success:
                let vc = PincodeViewController()
                vc.type = .emailVerification
                vc.pincodeTarget = self.email
                vc.showResendOption = false
                self.navigationController?.pushViewController(vc, animated: true)
                MixpanelManager.trackEvent(MixpanelEvents.RIDER_EMAIL_VERIFICATION_CONFIRMATION)
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }
}
