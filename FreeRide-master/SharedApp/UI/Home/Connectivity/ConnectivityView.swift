//
//  ConnectivityView.swift
//  FreeRide
//

import UIKit

class ConnectivityView: UIView {

    private var socketConnected: Bool = true {
        didSet {
            setTitle()
        }
    }

    var isConnected: Bool {
        return socketConnected
    }

    lazy var backgroundView: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    lazy var titleLabel: Label = {
        let label = Label()
        label.style = .subtitle1white
        label.numberOfLines = 0
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()

    init(margins: UIEdgeInsets = .zero) {
        super.init(frame: .zero)
        backgroundColor = .clear

        addSubview(backgroundView)
        backgroundView.cornerRadius = 16
        backgroundView.backgroundColor = Theme.Colors.tangerine
        NSLayoutConstraint.activate([
            backgroundView.topAnchor.constraint(equalTo: topAnchor, constant: margins.top),
            backgroundView.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -margins.bottom),
            backgroundView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: margins.left),
            backgroundView.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -margins.right)
        ])

        backgroundView.addSubview(titleLabel)
        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: backgroundView.topAnchor, constant: 20),
            titleLabel.bottomAnchor.constraint(equalTo: backgroundView.bottomAnchor, constant: -20),
            titleLabel.leadingAnchor.constraint(equalTo: backgroundView.leadingAnchor, constant: 20),
            titleLabel.trailingAnchor.constraint(equalTo: backgroundView.trailingAnchor, constant: -20)
        ])
        setTitle()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    func configureSocketStatus(isOnline: Bool) {
        socketConnected = isOnline
    }

    func checkSocketStatus() {
        let socketManager: Socket
        #if RIDER
        socketManager = RiderAppContext.shared.socket
        #elseif DRIVER
        socketManager = DriverAppContext.shared.socket
        #endif

        switch socketManager.client.status {
        case .connecting:
            socketConnected = false
        case .connected:
            socketConnected = true
        default:
            socketConnected = false
        }
    }

    private func setTitle() {
        if socketConnected {
            titleLabel.text = "The connection is back. Loading..."
        }
        else {
            titleLabel.text = "We are not hearing from our servers. Please check your internet connection.".localize()
        }
    }

}
