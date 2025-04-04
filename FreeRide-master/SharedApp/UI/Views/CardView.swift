//
//  CardView.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/18/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class CardView: UIView {

    override func awakeFromNib() {
        super.awakeFromNib()
        initialize()
    }

    init() {
        super.init(frame: .zero)
        initialize()
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        initialize()
    }

    func initialize() {
        backgroundColor = Theme.Colors.white
        cornerRadius = 16
        addShadow(color: Theme.Colors.darkGray.withAlphaComponent(0.3), offset: CGSize(width: 0, height: 3), opacity: 0.6, radius: 5)
    }
}

class BottomCardView : CardView {
    override func initialize() {
        backgroundColor = Theme.Colors.white
        cornerRadius = 16
        addShadow(color: Theme.Colors.darkGray.withAlphaComponent(0.3), offset: CGSize(width: 0, height: -3), opacity: 0.6, radius: 5)
    }
}
