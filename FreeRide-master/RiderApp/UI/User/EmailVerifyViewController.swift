//
//  EmailVerifyViewController.swift
//  RiderApp
//
//  Created by Andrew Boryk on 1/1/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

class EmailVerifyViewController: FormViewController {

    private let pageView: TitlePageView = {
        let view: TitlePageView = .instantiateFromNib()
        view.style = .emailValidation
        return view
    }()

    private let emailField: TextField = {
        let field = TextField()
        field.configure(name: "user_email".localize(), placeholder: "user_email".localize())
        field.validators = [RequiredValidator(), EmailValidator()]
        field.image = #imageLiteral(resourceName: "EmailBadge")
        field.keyboardType = .emailAddress
        return field
    }()

    override func viewDidLoad() {
        fields = [emailField]

        confirmationButtonTitle = "email_pre_deadline_warning_btn".localize()
        leftNavigationStyle = .back
        leftNavigationAction = .pop(true)

        super.viewDidLoad()

        emailField.text = context.dataStore.currentUser()?.email
    }

    override func addViewsBeforeFields() {
        formStackView.addArrangedSubview(pageView)
        pageView.pinHorizontalEdges(to: formStackView)
    }

    override func handleConfirmationAction() {
        guard isValidWithError() else {
            return
        }

        if emailField.text == context.dataStore.currentUser()?.email {
            
            ProgressHUD.show()
            
            context.api.requestEmailVerification(request: nil) { result in
                ProgressHUD.dismiss()
                switch result {
                case .success(_):
                    let vc = PincodeViewController()
                    vc.type = .emailVerification
                    vc.pincodeTarget = self.context.dataStore.currentUser()?.email
                    self.navigationController?.pushViewController(vc, animated: true)
                    MixpanelManager.trackEvent(MixpanelEvents.RIDER_EMAIL_VERIFICATION_CONFIRMATION)
                case .failure(let error):
                    self.presentAlert(for: error)
                }
            }
            
        } else {
            let vc = PasswordViewController()
            vc.email = emailField.trimmedText
            self.navigationController?.pushViewController(vc, animated: true)
            MixpanelManager.trackEvent(MixpanelEvents.RIDER_EMAIL_VERIFICATION_PASSWORD)
        }
    }
}
