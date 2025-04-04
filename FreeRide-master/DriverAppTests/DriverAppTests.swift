//
//  DriverAppTests.swift
//  DriverAppTests
//
//  Created by Andrew Boryk on 12/14/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import XCTest
@testable import DriverApp_Stage

class DriverAppTests: XCTestCase {

    var driverAppContext: DriverAppContext!
    var keychainManager: KeychainManager!
    var mockSecureDataStore: MockSecureDataStore!

    override func setUp() {
        mockSecureDataStore = MockSecureDataStore()
        keychainManager = KeychainManager(secureDataStore: mockSecureDataStore)

        let serverAPI = ServerAPI()
        driverAppContext = DriverAppContext(
            api: serverAPI,
            dataStore: DriverDataStore(),
            keychainManager: keychainManager
        )
    }

    func test01_SignIn_should_fail_with_unrecognized_user_account() {
        let expectedResponseCode: ServiceError.HTTPStatusCode = .forbidden //403
        let expectedErrorMessage = "email or password you entered is incorrect"

        let request = LoginRequest(
            email: NSUUID().uuidString + "@ridecircuit.com",
            password: "123456789"
        )

        let expectation = XCTestExpectation(description: "network request")
        driverAppContext.api.login(request) { result in
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

}
