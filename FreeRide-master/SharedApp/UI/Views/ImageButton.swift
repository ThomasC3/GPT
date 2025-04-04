//
//  ImageButton.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 30/09/2022.
//  Copyright © 2022 Circuit. All rights reserved.
//

import UIKit

class ImageButton: UIView {

    enum ImageAlignment {
        case left
        case top
    }

    lazy var imageView: UIImageView = {
        let imageView = UIImageView()
        imageView.translatesAutoresizingMaskIntoConstraints = false
        return imageView
    }()

    var imageAlignment: ImageAlignment = .left {
        didSet {
            // TODO: change dynamically.
        }
    }

    lazy var titleLabel: Label = {
        let label = Label()
        label.text = "Title"
        label.translatesAutoresizingMaskIntoConstraints = false
        label.numberOfLines = 0
        return label
    }()

    init(imageAlignment: ImageAlignment) {
        self.imageAlignment = imageAlignment
        super.init(frame: .zero)
    }

    override init(frame: CGRect) {
        self.imageAlignment = .left
        super.init(frame: frame)
        setupView()
    }

    required init?(coder: NSCoder) {
        self.imageAlignment = .left
        super.init(coder: coder)
        setupView()
    }

    func setupView() {
        backgroundColor = Theme.Colors.coolGray
        layer.cornerRadius = 6

        addSubview(imageView)
        addSubview(titleLabel)

        switch imageAlignment {
        case .left:
            titleLabel.textAlignment = .left
            NSLayoutConstraint.activate([
                imageView.trailingAnchor.constraint(equalTo: titleLabel.leadingAnchor, constant: -5),
                imageView.centerYAnchor.constraint(equalTo: titleLabel.centerYAnchor),
                titleLabel.topAnchor.constraint(equalTo: self.topAnchor, constant: 10),
                titleLabel.trailingAnchor.constraint(equalTo: self.trailingAnchor, constant: -10),
                titleLabel.bottomAnchor.constraint(equalTo: self.bottomAnchor, constant: -10),
                titleLabel.leadingAnchor.constraint(equalTo: self.centerXAnchor, constant: 5),
            ])
        case .top:
            titleLabel.textAlignment = .center
            NSLayoutConstraint.activate([
                imageView.centerXAnchor.constraint(equalTo: self.centerXAnchor),
                imageView.centerYAnchor.constraint(equalTo: self.centerYAnchor, constant: -10),
                titleLabel.topAnchor.constraint(equalTo: imageView.bottomAnchor, constant: 3),
                titleLabel.leadingAnchor.constraint(equalTo: self.leadingAnchor, constant: 10),
                titleLabel.trailingAnchor.constraint(equalTo: self.trailingAnchor, constant: -10),
                titleLabel.bottomAnchor.constraint(equalTo: self.bottomAnchor, constant: -10),
            ])
        }
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        super.touchesBegan(touches, with: event)
        titleLabel.textColor = titleLabel.textColor.withAlphaComponent(0.2)
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        super.touchesCancelled(touches, with: event)
        titleLabel.textColor = titleLabel.textColor.withAlphaComponent(1)
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        super.touchesEnded(touches, with: event)
        titleLabel.textColor = titleLabel.textColor.withAlphaComponent(1)
    }

}
