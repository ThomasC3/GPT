//
//  RegisterIncompleteViewController.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 15/07/2024.
//  Copyright © 2024 Circuit. All rights reserved.
//

import UIKit

class RegisterIncompleteViewController: RegisterViewController, LogoutHandler {

    var shouldResetRegistrationOnBack = false

    override func viewDidLoad() {
        pageView.numberOfPages = 2
        // Skip the first step: first name, email, etc.
        if style == .registerOne {
            style = .registerTwo
        }

        super.viewDidLoad()

        if style == .registerTwo {
            confirmationButtonTitle = "user_i_agree".localize()
        }

        if shouldResetRegistrationOnBack {
            self.leftNavigationAction = .custom({
                self.logout()
            })
        }
    }

    override func saveUserAccount() {
        let payload = UpdateUserRequest(
            firstName: nil,
            lastName: nil,
            zip: form.zipCode,
            gender: form.gender,
            dob: form.dob
        )
        updateUser(payload: payload)
    }

    private func updateUser(payload: UpdateUserRequest) {
        ProgressHUD.show()
        context.api.updateUser(payload) { result in
            ProgressHUD.dismiss()

            switch result {
            case .success(let response):
                self.handleSuccessfulRegistration(response: response)
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }

    override func transition(to style: TitlePageViewStyle) {
        let vc = RegisterIncompleteViewController()
        vc.style = style
        navigationController?.pushViewController(vc, animated: true)
    }

}
