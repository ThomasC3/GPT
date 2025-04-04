//
//  PassengerStackView.swift
//  Circuit
//
//  Created by Andrew Boryk on 1/11/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class PassengerStackView: UIStackView {

    func update(passengers: Int, pinEdges: Bool = false) {
        arrangedSubviews.forEach { removeArrangedSubview($0) }

        for _ in 0..<passengers {
            let indicator = PassengerIndicator()
            addArrangedSubview(indicator)
            if pinEdges {
                indicator.pinTopEdge(to: self, constant: 10, priority: .defaultHigh)
            }
        }
    }
}
