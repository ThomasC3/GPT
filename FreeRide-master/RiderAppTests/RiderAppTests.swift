//
//  RiderAppTests.swift
//  RiderAppTests
//
//  Created by Andrew Boryk on 11/28/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import XCTest
@testable import RiderApp_Stage

class RiderAppTests: XCTestCase {

    var riderAppContext: RiderAppContext!
    var keychainManager: KeychainManager!
    var mockSecureDataStore: MockSecureDataStore!

    static let startDate = Date()
    static let secretTesterPassword = NSUUID().uuidString

    var secretTesterEmail: String!

    let dateFormatter: DateFormatter = {
        let dateFormatter = DateFormatter()
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
        dateFormatter.dateFormat = "yyyy.MM.dd.HH.mm.ss"
        dateFormatter.timeZone = TimeZone(secondsFromGMT: 0)
        return dateFormatter
    }()

    override func setUp() {
        mockSecureDataStore = MockSecureDataStore()
        keychainManager = KeychainManager(secureDataStore: mockSecureDataStore)

        let serverAPI = ServerAPI()
        riderAppContext = RiderAppContext(
            api: serverAPI,
            dataStore: RiderDataStore(),
            keychainManager: keychainManager
        )

        secretTesterEmail = "ios.tester." + dateFormatter.string(from: Self.startDate) + "@ridecircuit.com"
    }

    override func tearDown() {
        // Put teardown code here. This method is called after the invocation of each test method in the class.
    }

    func test01_SignUp_should_succeed() {
        let form = RegisterViewController.RegisterForm(
            firstName: "iOS Tester",
            lastName: "Test Suite",
            email: secretTesterEmail,
            password: Self.secretTesterPassword,
            zipCode: "11111",
            gender: "Unspecified",
            dob: "1987-01-01",
            countryCode: "PT",
            phone: "+111111111",
            google: nil
        )

        let request = RegisterRequest(form: form)
        let expectation = XCTestExpectation(description: "network request")
        riderAppContext.api.register(request) { result in
            switch result {
            case .success(let response):
                XCTAssertNotEqual(response.accessToken, "")
                // FIXME: AccessToken is being stored using the global KeychainManager instance.
                //XCTAssertEqual(response.accessToken, self.keychainManager.getAccessToken())
            case .failure(let error):
                XCTFail("Request failed with \(error)")
            }
            expectation.fulfill()
        }
        wait(for: [expectation], timeout: 20)
    }

    func test02_SignIn_should_succeed() {
        let request = LoginRequest(
            email: secretTesterEmail,
            password: Self.secretTesterPassword
        )
        let expectation = XCTestExpectation(description: "network request")
        riderAppContext.api.login(request) { result in
            switch result {
            case .success(let response):
                XCTAssertNotEqual(response.accessToken, "")
                // FIXME: AccessToken is being stored using the global KeychainManager instance.
                //XCTAssertEqual(response.accessToken, self.keychainManager.getAccessToken())
            case .failure(let error):
                XCTFail("Request failed with \(error)")
            }
            expectation.fulfill()
        }
        wait(for: [expectation], timeout: 20)
    }

    func test03_SignIn_should_fail_with_unrecognized_user_account() {
        let expectedResponseCode: ServiceError.HTTPStatusCode = .forbidden //403
        let expectedErrorMessage = "email or password you entered is incorrect"

        let request = LoginRequest(
            email: NSUUID().uuidString + "@ridecircuit.com",
            password: "123456789"
        )

        let expectation = XCTestExpectation(description: "network request")
        riderAppContext.api.login(request) { result in
            switch result {
            case .success:
                XCTFail("Should not reach successful response")
            case .failure(let error):
                XCTAssertEqual(error.status, expectedResponseCode)
                XCTAssertTrue(error.localizedDescription.contains(expectedErrorMessage))
            }
            expectation.fulfill()
        }
        wait(for: [expectation], timeout: 20)
    }

    func test04_SignUp_should_fail_with_user_account_already_exists() {
        let expectedResponseCode: ServiceError.HTTPStatusCode = .badRequest //400
        let expectedErrorMessage = "account already exists for this email"

        let form = RegisterViewController.RegisterForm(
            firstName: "iOS Tester",
            lastName: "Test Suite",
            email: secretTesterEmail,
            password: Self.secretTesterPassword,
            zipCode: "11111",
            gender: "Unspecified",
            dob: "1987-01-01",
            countryCode: "PT",
            phone: "+111111111",
            google: nil
        )

        let request = RegisterRequest(form: form)
        let expectation = XCTestExpectation(description: "network request")
        riderAppContext.api.register(request) { result in
            switch result {
            case .success:
                XCTFail("Should not reach successful response")
            case .failure(let error):
                XCTAssertEqual(error.status, expectedResponseCode)
                XCTAssertTrue(error.localizedDescription.contains(expectedErrorMessage))
            }
            expectation.fulfill()
        }
        wait(for: [expectation], timeout: 20)
    }

    func test05_SignUp_should_fail_with_invalid_email() {
        // TODO
    }

}
