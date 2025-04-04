//
//  RatingButton.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/20/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

class RatingButton: Button {

    var completion: ((Int) -> Void)?

    convenience init(tag: Int, completion: ((Int) -> Void)?) {
        self.init()

        self.tag = tag
        self.accessibilityIdentifier = "ratingButton\(tag)"
        self.completion = completion
        
        setImage(#imageLiteral(resourceName: "StarUnfilledButton"), for: .normal)
        setImage(#imageLiteral(resourceName: "StarFilledButton"), for: .highlighted)
        setImage(#imageLiteral(resourceName: "StarFilledButton"), for: .selected)

        addTarget(self, action: #selector(buttonAction), for: .touchUpInside)
    }

    @objc private func buttonAction() {
        completion?(tag)
    }
}
