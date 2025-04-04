//
//  ForgotPasswordViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/7/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

class ForgotPasswordViewController: FormViewController {

    private let pageView: TitlePageView = {
        let view: TitlePageView = .instantiateFromNib()
        view.style = .forgotPassword
        return view
    }()

    private let emailField: TextField = {
        let field = TextField()
        field.configure(name: "Email".localize(), placeholder: "Email".localize())
        field.validators = [RequiredValidator(), EmailValidator()]
        field.image = #imageLiteral(resourceName: "EmailBadge")
        field.keyboardType = .emailAddress
        return field
    }()

    override func viewDidLoad() {
        fields = [emailField]

        confirmationButtonTitle = "Verify Email".localize()
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
        let request = ForgotPasswordRequest(email: emailField.trimmedText)
        context.api.forgotPassword(request) { result in
            ProgressHUD.dismiss()
            
            switch result {
            case .success(let response):
                let vc = PincodeViewController()
                vc.type = .passwordReset
                vc.pincodeTarget = response.email
                vc.leftNavigationStyle = .back
                vc.leftNavigationAction = .pop(true)
                self.navigationController?.pushViewController(vc, animated: true)
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }
}
