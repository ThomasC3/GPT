//
//  ChangePasswordViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class ChangePasswordViewController: FormViewController {

    private let pageView: TitlePageView = {
        let view: TitlePageView = .instantiateFromNib()
        view.style = .changePassword
        return view
    }()

    private let passwordField: TextField = {
        let field = TextField()
        field.configure(name: "Password".localize(), placeholder: "Password".localize())
        field.validators = [RequiredValidator(), PasswordValidator()]
        field.image = #imageLiteral(resourceName: "LockBadge")
        field.isSecureTextEntry = true
        return field
    }()

    private let confirmPasswordField: TextField = {
        let field = TextField()
        field.configure(name: "Password".localize(), placeholder: "Re-enter Password".localize())
        field.validators = [RequiredValidator(), PasswordValidator()]
        field.image = #imageLiteral(resourceName: "LockBadge")
        field.isSecureTextEntry = true
        return field
    }()

    override func viewDidLoad() {
        fields = [passwordField, confirmPasswordField]
        confirmationButtonTitle = "Change Password".localize()

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

        guard passwordField.trimmedText == confirmPasswordField.trimmedText else {
            presentAlert("Passwords Not Matching".localize(), message: "Please make sure that you've entered the same password twice.".localize())
            return
        }

        ProgressHUD.show()
        let request = ChangePasswordRequest(password: passwordField.trimmedText)
        context.api.changePassword(request) { result in
            ProgressHUD.dismiss()
            
            switch result {
            case .success(let response):
                Defaults.forgotPasswordAccessToken = nil

                let confirm = UIAlertAction(title: "Ok", style: .default, handler: { _ in
                    if self.context.isLoggedIn {
                        #if RIDER
                        for vc in self.navigationController?.viewControllers ?? [] {
                            if vc is ProfileViewController {
                                self.navigationController?.popToViewController(vc, animated: true)
                                return
                            }
                        }
                        #elseif DRIVER
                        let vc = DriverTabBarController()
                        UIApplication.shared.activeWindow?.rootViewController = vc
                        #endif
                    } else {
                        self.navigationController?.popToController(ofClass: LoginViewController.self, animated: true)
                    }
                })

                self.navigationController?.presentAlert("Success!".localize(), message: response.message, cancel: nil, confirm: confirm)

            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }
}
