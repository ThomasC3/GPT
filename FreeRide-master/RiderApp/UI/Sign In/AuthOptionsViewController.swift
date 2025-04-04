//
//  AuthOptionsViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/4/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit
import GoogleSignIn
import AuthenticationServices

/// Represents the available methods for user authentication (email, google, ...).
enum AuthenticationMethod {
    case email
    case google
    case apple
}

/// Represents the mode of authentication (login or register).
enum AuthenticationMode {
    case login
    case register
}

/// Serves as an intermediary step for both sign-in and sign-up processes,
/// offering choices between email, Google authentication, etc.
class AuthOptionsViewController: StackViewController, AuthCompletionHandler {

    private let optionsView: SignInView

    let mode: AuthenticationMode

    init(mode: AuthenticationMode) {
        self.mode = mode
        self.optionsView = SignInView.instantiateFromNib()
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        leftNavigationStyle = .back
        leftNavigationAction = .pop(true)

        super.viewDidLoad()

        optionsView.delegate = self
        optionsView.mode = mode
        optionsView.translatesAutoresizingMaskIntoConstraints = false

        middleStackView.addSubview(optionsView)
        optionsView.pinEdges(to: middleStackView, insets: UIEdgeInsets(top: 4, left: 30, bottom: 30, right: 30))

        let legalView: LegalDisclaimerView = .instantiateFromNib()
        legalView.type = mode == .login ? .login : .register
        legalView.delegate = self
        optionsView.buttonsStackView.addArrangedSubview(legalView)
    }

    func handle3rdPartyAccountResponse(response: UserResponse) {
        let userId = response.id
        let ctx = self.context
        ctx.dataStore.wipeAllUsersExcept(id: userId)
        let user = ctx.currentUser
        user.update(with: response)
        self.finishRiderAuth(user: user)
    }

    // MARK: - Google

    private func authWithGoogle() {
        GIDSignIn.sharedInstance.signIn(withPresenting: self) { signInResult, error in
            if let error {
                self.presentAlert("Google Sign In", message: error.localizedDescription)
                return
            }

            guard let signInResult = signInResult else {
                self.presentAlert("Google Sign In", message: "No response received from Google".localize())
                return
            }

            signInResult.user.refreshTokensIfNeeded { googleUser, error in
                if let error {
                    self.presentAlert("Google Sign In", message: error.localizedDescription)
                    return
                }

                guard let googleUser = googleUser else {
                    self.presentAlert("Google Sign In", message: "Google user is missing".localize())
                    return
                }

                //print("GOOGLE_DEBUG", user.idToken?.tokenString)
                //print("GOOGLE_DEBUG", user.accessToken.tokenString)

                let req = GoogleAuthRequest(accessToken: googleUser.accessToken.tokenString)
                self.context.api.authGoogle(req) { result in
                    switch result {
                    case .success(let response):
                        self.handle3rdPartyAccountResponse(response: response)
                    case .failure(let error):
                        self.presentAlert("Google Sign In", message: error.localizedDescription)
                    }
                }
            }
        }
    }

    // MARK: Apple

    private func authWithApple() {
        let appleIDProvider = ASAuthorizationAppleIDProvider()
        let request = appleIDProvider.createRequest()
        request.requestedScopes = [.fullName, .email]

        let authorizationController = ASAuthorizationController(authorizationRequests: [request])
        authorizationController.delegate = self
        authorizationController.presentationContextProvider = self
        authorizationController.performRequests()
    }

}

// MARK: Apple Sign In

fileprivate let kAppleSignInUserFirstName = "tmpAppleSignInFirstName"
fileprivate let kAppleSignInUserLastName = "tmpAppleSignInLastName"

extension AuthOptionsViewController: ASAuthorizationControllerDelegate {

    private func saveTemporaryUserInfo(firstName: String?, lastName: String?) {
        if let firstName {
            UserDefaults.standard.set(firstName, forKey: kAppleSignInUserFirstName)
        }
        if let lastName {
            UserDefaults.standard.set(lastName, forKey: kAppleSignInUserLastName)
        }
    }

    private func clearTemporaryUserInfo() {
        UserDefaults.standard.removeObject(forKey: kAppleSignInUserFirstName)
        UserDefaults.standard.removeObject(forKey: kAppleSignInUserLastName)
    }

    private func getTemporaryUserInfo() -> (firstName: String, lastName: String) {
        let firstName = UserDefaults.standard.string(forKey: kAppleSignInUserFirstName) ?? ""
        let lastName = UserDefaults.standard.string(forKey: kAppleSignInUserLastName) ?? ""
        return (firstName, lastName)
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            self.presentAlert("Apple Sign In", message: "Apple user credential is missing".localize())
            return
        }

        // identityToken is a JWT
        guard
            let identityToken = appleIDCredential.identityToken,
            let identityTokenString = String(data: identityToken, encoding: .utf8)
        else {
            self.presentAlert("Apple Sign In", message: "Failed to get identity token".localize())
            return
        }

        // First name and last name are only populated on the first Apple Sign-in.
        var firstName = appleIDCredential.fullName?.givenName
        var lastName = appleIDCredential.fullName?.familyName

        // If either firstName or lastName is not provided, use the temporarily stored ones.
        if firstName == nil || lastName == nil {
            let tempUserInfo = getTemporaryUserInfo()
            if firstName == nil && !tempUserInfo.firstName.isEmpty {
                firstName = tempUserInfo.firstName
            }
            if lastName == nil && !tempUserInfo.lastName.isEmpty {
                lastName = tempUserInfo.lastName
            }
        } else {
            // Save user info temporarily and clear them when the sign up as succeeded.
            saveTemporaryUserInfo(firstName: firstName, lastName: lastName)
        }

        //print("APPLE_USER_IDENTIFIER", appleIDCredential.user)
        //print("APPLE_USER_EMAIL", appleIDCredential.email ?? "")
        //print("APPLE_IDENTITY_TOKEN", identityTokenString)

        let req = AppleAuthRequest(
            identityToken: identityTokenString,
            firstName: firstName ?? "",
            lastName: lastName ?? ""
        )
        self.context.api.authApple(req) { result in
            switch result {
            case .success(let response):
                self.handle3rdPartyAccountResponse(response: response)
            case .failure(let error):
                self.presentAlert("Apple Sign In", message: error.localizedDescription)
            }
        }
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        let errorMessage: String
        if let authError = error as? ASAuthorizationError {
            switch authError.code {
            case .canceled:
                errorMessage = "Sign in was canceled.".localize()
            case .invalidResponse:
                errorMessage = "We couldn't process the response from Apple.".localize()
            case .notHandled:
                errorMessage = "Sign in request couldn't be handled at this time.".localize()
            case .failed:
                errorMessage = "Sign in request failed. Please check your internet connection and try again.".localize()
            case .notInteractive:
                errorMessage = "Sign in requires interaction. Please try again and follow the prompts.".localize()
            case .unknown:
                fallthrough
            @unknown default:
                errorMessage = "An unexpected error occurred with Apple Sign In. Please try again later.".localize()
            }
        } else {
            errorMessage = "An error occurred during Apple Sign In".localize() + ": \(error.localizedDescription)"
        }
        self.presentAlert("Apple Sign In", message: errorMessage)
    }

}

extension AuthOptionsViewController: ASAuthorizationControllerPresentationContextProviding {

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return self.view.window!
    }

}

extension AuthOptionsViewController: SignInViewDelegate {

    func shouldTransition(to flow: AuthenticationMethod, for variant: AuthenticationMode) {
        switch variant {
        case .login:
            switch flow {
            case .email:
                let vc = LoginViewController()
                navigationController?.pushViewController(vc, animated: true)
            case .google:
                authWithGoogle()
            case .apple:
                authWithApple()
            }
        case .register:
            switch flow {
            case .email:
                let vc = RegisterViewController()
                navigationController?.pushViewController(vc, animated: true)
            case .google:
                authWithGoogle()
            case .apple:
                authWithApple()
            }
        }
    }

}

extension AuthOptionsViewController: LegalDisclaimerViewDelegate {

    func didSelectConduct() {
        presentLegal(of: .conduct)
    }

    func didSelectTerms() {
        presentLegal(of: .terms)
    }

    func didSelectPrivacy() {
        presentLegal(of: .privacy)
    }

    private func presentLegal(of type: LegalViewController.LegalType) {
        let vc = LegalViewController()
        vc.type = type
        present(vc, animated: true)
    }

}
