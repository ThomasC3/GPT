//
//  JSONObjectArrayEncoding.swift
//  Circuit
//
//  Created by Andrew Boryk on 11/2/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Alamofire

struct JSONObjectArrayEncoding: ParameterEncoding {

    private let data: Data

    init(data: Data) {
        self.data = data
    }

    func encode(_ urlRequest: URLRequestConvertible, with parameters: Parameters?) throws -> URLRequest {
        var urlRequest = try urlRequest.asURLRequest()
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = data
        return urlRequest
    }
}
